import express from "express";
import dotenv from "dotenv"; // <--- Cargar variables de entorno
import { GoogleGenAI } from "@google/genai";
import cors from "cors";

// Cargar variables de entorno desde .env
dotenv.config();

const app = express();
const port = process.env.PORT ?? 3001; // Puerto para el backend

// Middleware para habilitar CORS
app.use(cors()); // <--- HABILITAR CORS (para todas las solicitudes en desarrollo)
//  Para producción, podrías querer restringirlo:
// app.use(cors({ origin: ['http://localhost:4321', 'https://www.figma.com']

//  Middleware para parsear JSON en las solicitudes, es una caracteristica de express
app.use(express.json());

//  Configuración de OpenAI
const geminiApiKey = process.env.API_KEY;
// console.log(openaiApiKey);

// en caso de que no tenga la API key definida, se termina el proceso
if (!geminiApiKey) {
  console.error("CRITICAL: OPENAI_API_KEY is not defined in .env file.");
  process.on("exit", () => {
    console.error("Exiting process due to missing OpenAI API key.");
  });
  process.exit(1); // Termina el proceso si la API key no está definida

  // Podrías incluso hacer process.exit(1) si la API key es esencial para arrancar.
}

// // console.log("OpenAI API Key (first few chars):", geminiApiKey ? geminiApiKey.substring(0, 5) + "..." : "NOT SET"); // No loguear la key completa

// Iniciando la conexión a gemini
const ai = new GoogleGenAI({ apiKey: geminiApiKey });

// // Endpoint para generar código
console.log("Starting server...");

// app.get("/", (req, res) => {
//   res.send("AI Backend server is running!");
// });

app.post("/api/generate-code", async (req, res) => {
  try {
    const { figmaData, technologies } = req.body;

    if (!figmaData || !technologies) {
      return res
        .status(400)
        .json({ error: "Figma data and technologies are required." });
    }

    const { leftTec, rightTec } = technologies;

    // --- Aquí va la lógica de Ingeniería de Prompts (Paso 4) ---
    // Construir el prompt basado en figmaData y technologies
    // Este es un ejemplo muy básico, necesitarás refinarlo significativamente
    let promptContent = `
      Eres un experto desarrollador frontend. Genera código para ${leftTec} y ${rightTec}
      basado en la siguiente descripción de elementos de Figma.
      Asegúrate de que el código sea limpio, semántico y siga las mejores prácticas.

      Descripción de los elementos:
      ${JSON.stringify(figmaData, null, 2)}

      Consideraciones adicionales:
      - Si es HTML y CSS, genera el HTML y el CSS por separado, claramente marcados (ej. <!-- HTML --> y /* CSS */ o similar).
      - Si es React, genera un componente funcional.
      - Si es Tailwind CSS, usa clases de Tailwind directamente en el HTML/JSX.
      - Intenta replicar el layout y los estilos lo más fielmente posible.
      - Para los nombres de clases CSS o componentes, puedes usar los nombres de los frames/layers de Figma si son descriptivos, o generar nombres genéricos.

      Por favor, proporciona solo el código resultante.
      Si generas HTML y CSS, sepáralos con comentarios como:
      <!-- HTML_CODE_START -->
      ... tu código HTML aquí ...
      <!-- HTML_CODE_END -->

      /* CSS_CODE_START */
      ... tu código CSS aquí ...
      /* CSS_CODE_END */

      Si es un solo bloque de código (ej. React con Tailwind), solo el bloque.
    `;

    // console.log("Sending prompt to OpenAI:", promptContent);

    // Llamada a la API de Gemini (ejemplo con gemini-1.5-flash)
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "admin",
          text: "Eres un experto en generacion de código para desarrolladores, en base a las propiedades que se te pasan de todos los elementos y diseños de figma generaras codigo profesional, semantico y que tenga sentido dependiendo de las caracteristicas y propiedades de cada uno de los elementos recibidos, siguiendo el orden jerarquico que posee cada uno, teniendo en cuenta sus hijos elementos y sus valores, no quiero que te pases ni olvides de ningun detalle de todos los elementos y quiero que escribas las cosas tal cual como estan en los diseños, si detectas un hijo de tipo texto, en su propiedad de caracteres esta lo que dice, y quiero que lo escribas tal cual, podrias hacer tambien recomendaciones pero las dejas como comentarios, quiero que el codigo sea los mas profesional posible, y te tomes el tiempo para analizar y detallar cada elemento y asi generar codigo mas eficiente, toma en cuenta todas las etiquetas que tengan sentido y genera los diseños lo mas parecido a los elementos y no confies tanto en los nombres de los elementos, porque a veces no son intuitivos ni descriptiovos por parte de los usuarios, basate para generar el diseño siempre en la jerarquia de elementos y sus hijos y en todas sus propiedades, y haz codigo profesional, analiza tambien las propiedades de los hijos, que esta en nodeData.childCss donde vas a tener una lista de objetos de cada una de las caracteristicas de los hijos, donde puedes encontrar el texto que dice en la propiedad (characters)",
        },
        {
          role: "user",
          text: promptContent,
        },
      ],
    });

    if (!response) {
      return res
        .status(500)
        .json({ error: "Failed to generate code from AI." });
    }

    console.log("Code generated by AI:", response.text);

    res.json({ code: response.text.trim() });
  } catch (error) {
    console.error(
      "Error generating code:",
      error.response ? error.response.data : error.message
    );
    res.status(500).json({
      error: "An error occurred while generating code.",
      details: error.message,
    });
  }
});

app.use((req, res) => {
  res.status(404).send("<h1>Página no encontrada!<h1/>");
});

app.listen(port, () => {
  console.log(`AI Backend server listening at http://localhost:${port}`);
});
