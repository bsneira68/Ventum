require('dotenv').config(); // Cargar variables de entorno desde .env
const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json()); // Habilita JSON en Express

const MONDAY_API_KEY = process.env.MONDAY_API_KEY;
const MONDAY_API_URL = 'https://api.monday.com/v2';
const BOARD_ID = 8612909250;
const COLUMN_ID_PRODUCTOS = "board_relation_mknqb0sa"; // Reemplázalo con el ID real de la columna

// Validación: Verificar que la API key está definida
if (!MONDAY_API_KEY) {
    console.error("❌ Error: MONDAY_API_KEY no está definida. Verifica las variables de entorno en Render.");
    process.exit(1); // Detiene la ejecución si no hay API key
}

console.log("🔍 MONDAY_API_KEY:", MONDAY_API_KEY ? "Cargada correctamente" : "No definida");

app.post('/webhook', async (req, res) => {
    try {
        const event = req.body.event;
        console.log("📩 Webhook recibido:", JSON.stringify(event, null, 2));

        if (!event || !event.pulseId) {
            console.error("❌ Evento inválido recibido.");
            return res.status(400).json({ error: "Evento inválido" });
        }

        console.log("📌 ID del tablero recibido:", event.boardId);
        
        const subitemId = event.pulseId;
        let linkedPulseId = event.value?.linkedPulseIds?.[0]?.linkedPulseId || 
                            event.previousValue?.linkedPulseIds?.[0]?.linkedPulseId;

        if (!linkedPulseId) {
            console.error("❌ No se encontró un linkedPulseId en el evento.");
            return res.status(400).json({ error: "No linkedPulseId found" });
        }

        // Obtener el nombre del ítem relacionado desde Monday
        const query = `query { items(ids: [${linkedPulseId}]) { name } }`;

        const response = await axios.post(MONDAY_API_URL, { query }, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": MONDAY_API_KEY
            }
        });

        const data = response.data;
        console.log("📬 Respuesta de Monday:", JSON.stringify(data, null, 2));

        if (!data?.data?.items?.length) {
            console.error("❌ No se pudo obtener el nombre del ítem relacionado.");
            return res.status(500).json({ error: "Error al obtener el nombre del ítem relacionado" });
        }

        let newName = data.data.items[0]?.name;

        if (!newName || typeof newName !== "string" || newName.trim() === "") {
            console.error("❌ Error: newName no es una cadena válida:", newName);
            return res.status(500).json({ error: "newName no es una cadena válida" });
        }

        newName = newName.replace(/"/g, '\\"');

        console.log(`✅ Actualizando subítem ${subitemId} con el nombre: "${newName}"`);

        // Enviar la actualización a Monday
        const mutation = {
            query: `mutation {
                change_column_value(item_id: ${subitemId}, board_id: ${BOARD_ID}, column_id: "name", value: "{\\"text\\": \\\"${newName}\\\"}" )
            }`
        };

        const updateResponse = await axios.post(MONDAY_API_URL, mutation, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": MONDAY_API_KEY
            }
        });

        const updateData = updateResponse.data;
        console.log("📬 Respuesta de actualización en Monday:", JSON.stringify(updateData, null, 2));

        if (!updateData?.data) {
            console.error("❌ Error al actualizar el subítem en Monday.");
            return res.status(500).json({ error: "Error en la actualización del subítem" });
        }

        res.sendStatus(200);
    } catch (error) {
        console.error("🔥 Error inesperado:", error);
        if (error.response) {
            console.error("❌ Error de Monday API:", JSON.stringify(error.response.data, null, 2));
        }
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor escuchando en el puerto ${PORT}`);
});
