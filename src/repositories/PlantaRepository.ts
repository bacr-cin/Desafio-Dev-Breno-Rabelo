import { Luminosidade, Prisma } from "@prisma/client";
import prisma from "@database";

export type FiltrosPlanta = {
    luminosidade?: Luminosidade;
    petFriendly?: boolean;
    nome?: string;
    ordem?: "preco" | "nome";
};

export async function createPlanta(dados: Prisma.PlantaCreateInput) {
return prisma.planta.create({ data: dados });
}

export async function findAllPlantas(filtros: FiltrosPlanta = {}) {
    let orderBy: Prisma.PlantaOrderByWithRelationInput = { id: "asc" };
    if (filtros.ordem === "preco") orderBy = { preco: "asc" };
    if (filtros.ordem === "nome") orderBy = { nome: "asc" };
    
    return prisma.planta.findMany({
        where: {
            luminosidade: filtros.luminosidade,
            petFriendly: filtros.petFriendly,
            nome: filtros.nome === undefined ? undefined : { contains: filtros.nome, mode:
            "insensitive" },
        },
        orderBy,
    });
}
export async function findPlantaById(id: number) {
    return prisma.planta.findUnique({ where: { id } });
}
export async function updatePlanta(id: number, dados: Prisma.PlantaUpdateInput) {
    return prisma.planta.update({ where: { id }, data: dados });
}

export async function deletePlanta(id: number) {
    return prisma.planta.delete({ where: { id } });
}


export async function findPrecosEEstoques() {
    return prisma.planta.findMany({ select: { preco: true, estoque: true } });
}

export async function venderSeHouverEstoque(id: number, quantidade: number) {
    const resultado = await prisma.planta.updateMany({
    where: { id, estoque: { gte: quantidade } }, // gte = maior ou igual
    data: { estoque: { decrement: quantidade } },
    });
    return resultado.count > 0; // true: vendeu; false: não havia estoque suficiente
}