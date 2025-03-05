const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 3000;

app.use(express.json()); // Habilita JSON en Express

const MONDAY_API_KEY = process.env.MONDAY_API_KEY;
const MONDAY_API_URL = 'https://api.monday.com/v2';
const BOARD_ID = process.env.BOARD_ID;
const COLUMN_ID_PRODUCTOS = "board_relation_mknqb0sa"; // Reemplázalo con el ID real de la columna

app.post('/webhook', async (req, res) => {
    try {
        console.log('Webhook recibido:', JSON.stringify(req.body, null, 2));

        const { event } = req.body;
        if (!event || !event.pulseId || !event.value) {
            return res.status(400).json({ error: 'Faltan datos en el webhook' });
        }

        const subitemId = event.pulseId; // ID del subítem
        const linkedPulseIds = event.value.linkedPulseIds; // IDs de los ítems relacionados

        if (!linkedPulseIds || linkedPulseIds.length === 0) {
            return res.status(400).json({ error: 'No hay ítems relacionados en Productos Proveedores' });
        }

        const linkedPulseId = linkedPulseIds[0].linkedPulseId; // Tomar el primer ítem relacionado

        // Consultar el nombre del ítem relacionado
        const query = `
            query {
                items(ids: [${linkedPulseId}]) {
                    name
                }
            }
        `;

        const response = await axios.post(
            MONDAY_API_URL,
            { query },
            { headers: { Authorization: MONDAY_API_KEY, 'Content-Type': 'application/json' } }
        );

        const newName = response.data.data.items[0]?.name;

        if (!newName) {
            return res.status(400).json({ error: 'No se pudo obtener el nombre del ítem relacionado' });
        }

        console.log(`Actualizando subítem ${subitemId} con el nombre: ${newName}`);

        // Query para actualizar el nombre del subítem en Monday
        const updateQuery = `
            mutation {
                change_simple_column_value(
                    item_id: ${subitemId},
                    board_id: ${BOARD_ID},
                    column_id: "name",
                    value: "${newName}"
                ) {
                    id
                }
            }
        `;

        // Enviar petición a Monday
        const updateResponse = await axios.post(
            MONDAY_API_URL,
            { query: updateQuery },
            { headers: { Authorization: MONDAY_API_KEY, 'Content-Type': 'application/json' } }
        );

        console.log('Respuesta de Monday:', updateResponse.data);
        res.status(200).json({ message: 'Nombre del subítem actualizado en Monday', data: updateResponse.data });
    } catch (error) {
        console.error('Error al actualizar en Monday:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
