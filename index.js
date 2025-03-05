const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 3000;

app.use(express.json()); // Habilita JSON en Express

const MONDAY_API_KEY = 'eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjIyMzkxMDkzNCwiYWFpIjoxMSwidWlkIjozMDM2NzU1NSwiaWFkIjoiMjAyMy0wMS0xN1QwMjo0Njo1Mi4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6MTIxMTE2MjIsInJnbiI6InVzZTEifQ.ueBSuBNbdf87DgM7S2pidVOuLW_Z1QGAeIzCnxvsdJM'; // API Key de Monday
const MONDAY_API_URL = 'https://api.monday.com/v2';
const BOARD_ID = 8612909250; // ID del tablero en Monday
const COLUMN_ID_PRODUCTOS = "board_relation_mknqb0sa"; // ID de la columna que activa el webhook

// RUTA DEL WEBHOOK
const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = 3000;

app.use(express.json());

const MONDAY_API_KEY = process.env.MONDAY_API_KEY; // Usar variables de entorno
const MONDAY_API_URL = 'https://api.monday.com/v2';
const BOARD_ID = parseInt(process.env.BOARD_ID, 10); // Tablero principal

app.post('/webhook', async (req, res) => {
    try {
        console.log('Webhook recibido:', JSON.stringify(req.body, null, 2));

        const { event } = req.body;
        if (!event || !event.pulseId || !event.value || !event.value.linkedPulseIds) {
            return res.status(400).json({ error: 'Faltan datos en el webhook' });
        }

        const subitemId = event.pulseId; // ID del subítem que se actualizará
        const linkedPulseId = event.value.linkedPulseIds[0]?.linkedPulseId; // ID del producto proveedor

        if (!linkedPulseId) {
            console.error('❌ No se encontró linkedPulseId en la relación.');
            return res.status(400).json({ error: 'No hay productos proveedores vinculados' });
        }

        console.log(`🔍 Buscando nombre del item relacionado con ID: ${linkedPulseId}`);

        // Consulta a Monday para obtener el nombre del producto proveedor
        const queryGetName = `
            query {
                items(ids: ${linkedPulseId}) {
                    id
                    name
                }
            }
        `;

        const responseGetName = await axios.post(
            MONDAY_API_URL,
            { query: queryGetName },
            { headers: { Authorization: MONDAY_API_KEY, 'Content-Type': 'application/json' } }
        );

        const itemName = responseGetName.data?.data?.items[0]?.name;

        if (!itemName) {
            console.error('❌ No se pudo obtener el nombre del item relacionado.');
            return res.status(400).json({ error: 'No se pudo obtener el nombre del producto proveedor' });
        }

        console.log(`✅ Nombre obtenido: ${itemName}`);
        console.log(`🔄 Actualizando subítem ${subitemId} con el nombre: ${itemName}`);

        // Consulta para actualizar el nombre del subítem
        const queryUpdateName = `
            mutation {
                change_simple_column_value(
                    item_id: ${subitemId},
                    board_id: ${BOARD_ID},
                    column_id: "name",
                    value: "${itemName}"
                ) {
                    id
                }
            }
        `;

        const responseUpdateName = await axios.post(
            MONDAY_API_URL,
            { query: queryUpdateName },
            { headers: { Authorization: MONDAY_API_KEY, 'Content-Type': 'application/json' } }
        );

        console.log('✅ Respuesta de Monday al actualizar:', responseUpdateName.data);
        res.status(200).json({ message: 'Nombre del subítem actualizado en Monday', data: responseUpdateName.data });

    } catch (error) {
        console.error('❌ Error al actualizar en Monday:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
