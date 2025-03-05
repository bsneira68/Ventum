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
        const event = req.body.event;
        console.log("Webhook recibido:", JSON.stringify(event, null, 2));

        const subitemId = event.pulseId;
        let linkedPulseId = null;

        // Validar la estructura de `linkedPulseIds`
        if (event.value?.linkedPulseIds?.length > 0) {
            linkedPulseId = event.value.linkedPulseIds[0].linkedPulseId;
        } else if (event.previousValue?.linkedPulseIds?.length > 0) {
            linkedPulseId = event.previousValue.linkedPulseIds[0].linkedPulseId;
        }

        if (!linkedPulseId) {
            console.error("❌ No se encontró un linkedPulseId en el evento.");
            return res.status(400).json({ error: "No linkedPulseId found" });
        }

        // Obtener el nombre del ítem relacionado desde Monday
        const query = `query {
            items(ids: [${linkedPulseId}]) {
                name
            }
        }`;

        const response = await fetch("https://api.monday.com/v2", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": process.env.MONDAY_API_KEY
            },
            body: JSON.stringify({ query })
        });

        const data = await response.json();
        console.log("Respuesta de Monday:", JSON.stringify(data, null, 2));

        // Validar que la respuesta contenga un nombre válido
        if (!data?.data?.items || !Array.isArray(data.data.items) || data.data.items.length === 0) {
            console.error("❌ No se pudo obtener el nombre del ítem relacionado.");
            return res.status(500).json({ error: "Error al obtener el nombre del ítem relacionado" });
        }

        const newName = data.data.items[0]?.name;

        // Validar que newName sea una cadena antes de usarlo
        if (typeof newName !== "string" || newName.trim() === "") {
            console.error("❌ Error: newName no es una cadena válida:", newName);
            return res.status(500).json({ error: "newName no es una cadena válida" });
        }

        console.log(`✅ Actualizando subítem ${subitemId} con el nombre: "${newName}"`);

        // Enviar la actualización a Monday
        const updateQuery = `mutation {
            change_simple_column_value(item_id: ${subitemId}, board_id: ${event.boardId}, column_id: "name", value: "${newName}")
        }`;

        const updateResponse = await fetch("https://api.monday.com/v2", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": process.env.MONDAY_API_KEY
            },
            body: JSON.stringify({ query: updateQuery })
        });

        const updateData = await updateResponse.json();
        console.log("Respuesta de actualización en Monday:", JSON.stringify(updateData, null, 2));

        if (!updateData?.data) {
            console.error("❌ Error al actualizar el subítem en Monday.");
            return res.status(500).json({ error: "Error en la actualización del subítem" });
        }

        res.sendStatus(200);
    } catch (error) {
        console.error("❌ Error inesperado:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});
