/*=================== MODULOS ===================*/
import express from "express";
import exphbs from "express-handlebars";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import morgan from "morgan";
import minimist from "minimist";
import util from "util";
import cluster from "cluster";
import os from 'os';
import { ContenedorSQLite } from "./src/container/ContenedorSQLite.js";
import { ContenedorFirebase } from "./src/container/ContenedorFirebase.js";
import { Server as HttpServer } from "http";
import { Server as IOServer } from "socket.io";
import * as dotenv from 'dotenv'
dotenv.config();

/*=== Instancia de Server, contenedor y rutas ===*/
const app = express();
const httpServer = new HttpServer(app);
const io = new IOServer(httpServer);
const cajaMensajes = new ContenedorFirebase("mensajes");
const cajaProducto = new ContenedorSQLite("productos");
import routerProductos from "./src/routes/productos.routes.js";
import routerInitial from "./src/routes/initial.routes.js";
import routerProductosTest from "./src/routes/productosTest.routes.js";
import routerTesting from './src/routes/testingMongoDB.routes.js'

/*================= Middlewears =================*/
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use('/static', express.static(path.join(__dirname, 'public')));

/*================ Session Setup ================*/
import connectMongo from 'connect-mongo'
const MongoStore = connectMongo.create({
  mongoUrl: process.env.MONGO_URL,
  ttl: 600,
  mongoOptions: {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }
})

app.use(session({
  store: MongoStore,
  secret: process.env.SECRET_KEY,
  resave: true,
  saveUninitialized: true
}))

/*============= Motor de plantillas =============*/
app.engine(
  "hbs",
  exphbs.engine({
    defaulyLayout: "main",
    layoutsDir: path.join(app.get("views"), "layouts"),
    partialsDir: path.join(app.get("views"), "partials"),
    extname: "hbs",
  })
);
app.set("views", path.join("views"));
app.set("view engine", "hbs");

/*==================== Rutas ====================*/
app.use("/", routerInitial);
app.use("/test", routerTesting);
app.use("/api/productos", routerProductos);
app.use("/api/productos-test", routerProductosTest);
app.use("*", (req, res) => {
  res.send({ error: "Probablemente la ruta a la que intentas acceder no exista" });
});


/*================== Servidor ==================*/
const minimistOptions = {default: {p: 8080}}
const proceso = minimist(process.argv.slice(2), minimistOptions)

const PORT = proceso.p;
const server = httpServer.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});
server.on("error", (error) => console.log(`Error en el servidor: ${error}`));

io.on("connection", async (socket) => {
  const DB_MENSAJES = await listarMensajesNormalizados();
  const DB_PRODUCTOS = await cajaProducto.listarAll();
  console.log(`Nuevo cliente conectado -> ID: ${socket.id}`);
  io.sockets.emit("from-server-message", DB_MENSAJES);
  io.sockets.emit("from-server-product", DB_PRODUCTOS);

  socket.on("from-client-message", async (mensaje) => {
    await cajaMensajes.save(mensaje);
    const MENSAJES = await listarMensajesNormalizados();
    io.sockets.emit("from-server-message", MENSAJES);
  });

  socket.on("from-client-product", async (product) => {
    await cajaProducto.insertar(product);
    const PRODUCTOS = await cajaProducto.listarAll();
    io.sockets.emit("from-server-product", PRODUCTOS);
  });

});

/*=============== Normalizacion de datos ===============*/
import { normalize, schema, denormalize } from "normalizr";
import session from "express-session";

const schemaAuthors = new schema.Entity("author", {}, { idAttribute: "email" });
const schemaMensaje = new schema.Entity(
  "post",
  { author: schemaAuthors },
  { idAttribute: "id" }
);
const schemaMensajes = new schema.Entity(
  "posts",
  { mensajes: [schemaMensaje] },
  { idAttribute: "id" }
);

const normalizarMensajes = (mensajesConId) =>
  normalize(mensajesConId, schemaMensajes);

async function listarMensajesNormalizados() {
  const mensajes = await cajaMensajes.getAll();
  console.log(
    `Los mensajes sin normalizar: ${JSON.stringify(mensajes).length}`
  );
  const normalizados = normalizarMensajes({ id: "mensajes", mensajes });
  return normalizados;
}

/* function print(obj) {
    console.log(util.inspect(obj, false, 12, true))
} */