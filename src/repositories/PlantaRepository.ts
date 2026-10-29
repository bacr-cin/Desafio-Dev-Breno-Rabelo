import { Luminosidade, Prisma } from "@prisma/client";
import prisma from "@database";

export type FiltrosPlanta = {
    luminosidade?: Luminosidade;
    petFriendly?: boolean;
};

export async function createPlanta(dados: Prisma.PlantaCreateInput) {
return prisma.planta.create({ data: dados });
}

export async function findAllPlantas(filtros: FiltrosPlanta = {}) {
    return prisma.planta.findMany({
        where: {
            luminosidade: filtros.luminosidade,
            petFriendly: filtros.petFriendly,
        },
            orderBy: { id: "asc" },
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

export async function decrementEstoque(id: number, quantidade: number) {
    return prisma.planta.update({
    where: { id },
        data: { estoque: { decrement: quantidade } },
        });
}

export async function findPrecosEEstoques() {
    return prisma.planta.findMany({ select: { preco: true, estoque: true } });
}