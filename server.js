// server.js
import path from "path";
import express from "express";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);  // basically pwd at .

const app = express();
const PORT = process.env.PORT || 3000;

// runs on every request
app.use(express.static(path.join(__dirname, "public")));  // /.../public
// Every request → check if file exists in public/ → if yes serve it → if no, pass to next handler 

// GET: match any URL path, send a file back to the browser
app.get("/*all", (req, res) => {
	res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
	console.log(`Lolo homepage listening on http://0.0.0.0:${PORT}`);
});
