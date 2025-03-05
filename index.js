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
app.post('/webhook', async (req, res) => {
    try {
        console.log('Webhook recibido:', JSON.stringify(req.body, null, 2));

        if (req.body.challenge) {
            console.log('Enviando challenge de vuelta:', req.body.challenge);
            return res.status(200).json({ challenge: req.body.challenge });
        }

        const { event } = req.body;

        if (!event || !event.pulseId || !event.value || !event.value.linkedPulseIds) {
            return res.status(400).json({ error: 'Faltan datos en el webhook' });
        }

        const subitemId = event.pulseId;
        const linkedPulseId = event.value.linkedPulseIds[0]?.linkedPulseId; // ID del item vinculado

        if (!linkedPulseId) {
            return res.status(400).json({ error: 'No se encontró un item vinculado' });
        }

        console.log(`Buscando nombre del ítem vinculado con ID: ${linkedPulseId}`);

        // 🔹 Consulta para obtener el nombre del ítem vinculado
        const queryGetName = `
            query {
                items(ids: [${linkedPulseId}]) {
                    name
                }
            }
        `;

        const responseGetName = await axios.post(
            MONDAY_API_URL,
            { query: queryGetName },
            { headers: { Authorization: MONDAY_API_KEY, 'Content-Type': 'application/json' } }
        );

        const newName = responseGetName.data?.data?.items[0]?.name;

        if (!newName) {
            return res.status(400).json({ error: 'No se pudo obtener el nombre del ítem vinculado' });
        }

        console.log(`Actualizando subítem ${subitemId} con el nombre: ${newName}`);

        // 🔹 Query para actualizar el nombre del subítem en Monday
        const queryUpdateName = `
            mutation {
                change_simple_column_value(
                    item_id: ${subitemId},
                    board_id: ${BOARD_ID},
                    column_id: "name",
                    value: "${newName.replace(/"/g, '\\"')}"
                ) {
                    id
                }
            }
        `;

        const responseUpdate = await axios.post(
            MONDAY_API_URL,
            { query: queryUpdateName },
            { headers: { Authorization: MONDAY_API_KEY, 'Content-Type': 'application/json' } }
        );

        console.log('✅ Nombre del subítem actualizado en Monday:', responseUpdate.data);
        res.status(200).json({ message: 'Nombre del subítem actualizado en Monday', data: responseUpdate.data });
    } catch (error) {
        console.error('❌ Error al actualizar en Monday:', error.response?.data || error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
