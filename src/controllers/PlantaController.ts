import { Request, Response } from "express";
import { Luminosidade } from "@prisma/client";
import {
createPlanta,
deletePlanta,
findAllPlantas,
findPlantaById,
updatePlanta,
venderSeHouverEstoque,
findPrecosEEstoques
} from "@repositories/PlantaRepository";

type DadosPlanta = {
    nome?: unknown;
    especie?: unknown;
    preco?: unknown;
    estoque?: unknown;
    luminosidade?: unknown;
    petFriendly?: unknown;
    regaACadaDias?: unknown;
};

const CAMPOS_OBRIGATORIOS = [
"nome",
"especie",
"preco",
"estoque",
"luminosidade",
"petFriendly",
"regaACadaDias",
] as const;

const VALORES_LUMINOSIDADE = Object.values(Luminosidade).join(", ");

function ehTextoNaoVazio(valor: unknown): valor is string {
    return typeof valor === "string" && valor.trim() !== "";
}

function ehInteiro(valor: unknown): valor is number {
    return Number.isInteger(valor);
}

function ehLuminosidade(valor: unknown): valor is Luminosidade {
    return typeof valor === "string" && (Object.values(Luminosidade) as
    string[]).includes(valor);
}

// Devolve a mensagem do primeiro erro encontrado, ou null se estiver tudo certo.
function validarDadosPlanta(dados: DadosPlanta, exigirTodos: boolean): string | null {
    if (exigirTodos) {
    for (const campo of CAMPOS_OBRIGATORIOS) {
        if (dados[campo] === undefined) {
            return `O campo '${campo}' é obrigatório.`;
            }
        }
    }

    const { nome, especie, preco, estoque, luminosidade, petFriendly, regaACadaDias } = dados;

    if (nome !== undefined && !ehTextoNaoVazio(nome)) {
        return "O campo 'nome' deve ser um texto não vazio.";
    }
    if (especie !== undefined && !ehTextoNaoVazio(especie)) {
        return "O campo 'especie' deve ser um texto não vazio.";
    }
    if (preco !== undefined && !(ehInteiro(preco) && preco > 0)) {
        return "O campo 'preco' deve ser um número inteiro maior que zero, em centavos.";
    }
    if (estoque !== undefined && !(ehInteiro(estoque) && estoque >= 0)) {
        return "O campo 'estoque' deve ser um número inteiro maior ou igual a zero.";
    }
    if (luminosidade !== undefined && !ehLuminosidade(luminosidade)) {
        return `O campo 'luminosidade' deve ser um destes valores: ${VALORES_LUMINOSIDADE}.`;
    }
    if (petFriendly !== undefined && typeof petFriendly !== "boolean") {
        return "O campo 'petFriendly' deve ser true ou false (sem aspas).";
    }
    if (regaACadaDias !== undefined && !(ehInteiro(regaACadaDias) && regaACadaDias >= 1)) {
        return "O campo 'regaACadaDias' deve ser um número inteiro maior ou igual a 1.";
    }
        return null;
}

// O :id chega como texto. Devolve o número, ou null se não for um inteiro positivo.
function lerId(req: Request): number | null {
    const id = Number(req.params.id);
    return Number.isInteger(id) && id > 0 ? id : null;
}

export async function criarPlanta(req: Request, res: Response) {
    try {
        const { nome, especie, preco, estoque, luminosidade, petFriendly, regaACadaDias } = req.body ?? {};

        const dados = { nome, especie, preco, estoque, luminosidade, petFriendly, regaACadaDias };

        const erro = validarDadosPlanta(dados, true);

        if (erro !== null) {
            return res.status(400).json({ message: erro });
        }

        const planta = await createPlanta(dados);
        return res.status(201).json(planta);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erro interno ao cadastrar a planta." });
    }
}

export async function listarPlantas(req: Request, res: Response) {
    try {
        const { luminosidade, petFriendly } = req.query;
        let filtroLuminosidade: Luminosidade | undefined;
        if (luminosidade !== undefined) {
            if (!ehLuminosidade(luminosidade)) {
                return res.status(400).json({
                message: `Filtro 'luminosidade' inválido. Use um destes valores: ${VALORES_LUMINOSIDADE}.`,});
            }
        filtroLuminosidade = luminosidade;
        }

        let filtroPetFriendly: boolean | undefined;
        
        if (petFriendly !== undefined) {
            if (petFriendly !== "true" && petFriendly !== "false") {
            return res.status(400).json({ message: "Filtro 'petFriendly' inválido. Use true ou false." });
            }
        filtroPetFriendly = petFriendly === "true";
        }

        const plantas = await findAllPlantas({
        luminosidade: filtroLuminosidade,
        petFriendly: filtroPetFriendly,
        });

        return res.status(200).json(plantas);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erro interno ao listar as plantas." });
    }
}


export async function buscarPlanta(req: Request, res: Response) {
    try {
        const id = lerId(req);
        if (id === null) {
            return res.status(400).json({ message: "O id deve ser um número inteiro positivo." });
        }

        const planta = await findPlantaById(id);

        if (planta === null) {
            return res.status(404).json({ message: `Planta com id ${id} não encontrada.` });
        }
        return res.status(200).json(planta);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erro interno ao buscar a planta." });
    }
}

export async function editarPlanta(req: Request, res: Response) {
    try {
        const id = lerId(req);
        if (id === null) {
            return res.status(400).json({ message: "O id deve ser um número inteiro positivo." });
        }

        const { nome, especie, preco, estoque, luminosidade, petFriendly, regaACadaDias } =
        req.body ?? {};
        
        const dados = { nome, especie, preco, estoque, luminosidade, petFriendly, regaACadaDias };
        const nenhumCampoEnviado = Object.values(dados).every((valor) => valor === undefined);
        
        if (nenhumCampoEnviado) {
            return res.status(400).json({ message: "Envie ao menos um campo para editar." });
        }
        
        const erro = validarDadosPlanta(dados, false);
        
        if (erro !== null) {
            return res.status(400).json({ message: erro });
        }
        const existente = await findPlantaById(id);
        
        if (existente === null) {
            return res.status(404).json({ message: `Planta com id ${id} não encontrada.` });
        }
        
        const planta = await updatePlanta(id, dados);
        return res.status(200).json(planta);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erro interno ao editar a planta." });
    }
}

export async function deletarPlanta(req: Request, res: Response) {
    try {
        const id = lerId(req);
        if (id === null) {
            return res.status(400).json({ message: "O id deve ser um número inteiro positivo." });
        }
        
        const existente = await findPlantaById(id);
        
        if (existente === null) {
            return res.status(404).json({ message: `Planta com id ${id} não encontrada.` });
        }
        
        await deletePlanta(id);
        return res.status(204).send();
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erro interno ao deletar a planta." });
    }
}

export async function venderPlanta(req: Request, res: Response) {
    try {
        const id = lerId(req);
        if (id === null) {
            return res.status(400).json({ message: "O id deve ser um número inteiro positivo." });
        }

        const { quantidade } = req.body ?? {};
        
        if (!ehInteiro(quantidade) || quantidade <= 0) {
            return res.status(400).json({ message: "O campo 'quantidade' deve ser um número inteiro maior que zero." });
        }

        const planta = await findPlantaById(id);
        
        if (planta === null) {
            return res.status(404).json({ message: `Planta com id ${id} não encontrada.` });
        }
        
        if (planta.estoque < quantidade) {
            return res.status(400).json({
            message: `Estoque insuficiente: temos só ${planta.estoque} vaso(s) de ${planta.nome}.`,
        });
        }
        const vendeu = await venderSeHouverEstoque(id, quantidade);
        if (!vendeu) {
            return res.status(400).json({ message: "Estoque insuficiente: outra venda terminou antes desta." });
        }

        const atualizada = await findPlantaById(id);
        return res.status(200).json(atualizada);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erro interno ao registrar a venda." });
    }
}

export async function valorTotalEstoque(_req: Request, res: Response) {
    try {
        const plantas = await findPrecosEEstoques();
        let valorTotalEmCentavos = 0;
        let totalDeVasos = 0;
        for (const planta of plantas) {
            valorTotalEmCentavos += planta.preco * planta.estoque;
            totalDeVasos += planta.estoque;
        }

        return res.status(200).json({ valorTotalEmCentavos, totalDeVasos });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erro interno ao calcular o valor do estoque." });
    }
}