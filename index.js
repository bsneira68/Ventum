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

        // 🔹 Validación del "challenge" de Monday
        if (req.body.challenge) {
            return res.json({ challenge: req.body.challenge });
        }

        // 🔹 Extraer datos del webhook
        const { event } = req.body;

        if (!event || !event.pulseId || !event.value) {
            return res.status(400).json({ error: 'Faltan datos en el webhook' });
        }

        const subitemId = event.pulseId; // ID del subítem
        const newName = event.value; // Nuevo nombre del subítem (valor de la columna "Productos Proveedores")

        console.log(`Actualizando subítem ${subitemId} con el nombre: ${newName}`);

        // 🔹 Query para actualizar el nombre del subítem en Monday
        const query = `
            mutation {
                change_simple_column_value(
                    item_id: ${subitemId},
                    board_id: ${BOARD_ID},
                    column_id: "name",
                    value: "${newName.replace(/"/g, '\\"')}" // Escapar comillas para evitar errores
                ) {
                    id
                }
            }
        `;

        // 🔹 Enviar petición a Monday
        const response = await axios.post(
            MONDAY_API_URL,
            { query },
            { headers: { Authorization: MONDAY_API_KEY, 'Content-Type': 'application/json' } }
        );

        console.log('Respuesta de Monday:', response.data);
        res.status(200).json({ message: 'Nombre del subítem actualizado en Monday', data: response.data });
    } catch (error) {
        console.error('❌ Error al actualizar en Monday:', error.response?.data || error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// INICIAR EL SERVIDOR
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
