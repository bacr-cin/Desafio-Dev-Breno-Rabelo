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
            petfriendly: filtros.petFriendly,
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