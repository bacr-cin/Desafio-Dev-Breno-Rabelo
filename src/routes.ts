import express from "express";
import * as UserController from "@controllers/UserController";
import {
buscarPlanta,
criarPlanta,
deletarPlanta,
editarPlanta,
listarPlantas,
valorTotalEstoque,
venderPlanta,
} from "./controllers/PlantaController";

const routes = express.Router();

routes.get("/", (req, res) => {
  res.status(200).json({ message: "API do treinamento de CRUD do CITi 🚀" });
});

routes.get("/plantas/estoque/valor-total", valorTotalEstoque);

// CRUD de usuários
routes.post("/users", UserController.createUser);
routes.get("/users", UserController.readAllUsers);
routes.get("/users/:id", UserController.readUserById);
routes.patch("/users/:id", UserController.updateUser);
routes.delete("/users/:id", UserController.deleteUser);

//CRUD das plantas
routes.post("/plantas", criarPlanta);
routes.get("/plantas", listarPlantas);
routes.get("/plantas/:id", buscarPlanta);
routes.patch("/plantas/:id", editarPlanta);
routes.delete("/plantas/:id", deletarPlanta);

//vendas
routes.post("/plantas/:id/venda", venderPlanta);

export default routes;
