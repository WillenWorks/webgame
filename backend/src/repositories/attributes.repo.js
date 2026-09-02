import prisma from '../config/prisma.js';

const MODELS = {
  attr_sex: () => prisma.attrSex,
  attr_hair: () => prisma.attrHair,
  attr_hobby: () => prisma.attrHobby,
  attr_vehicle: () => prisma.attrVehicle,
  attr_feature: () => prisma.attrFeature,
};

export async function getRandomAttribute(table) {
  const model = MODELS[table];
  if (!model) throw new Error(`getRandomAttribute: tabela desconhecida "${table}"`);
  const rows = await model().findMany({ select: { id: true, name: true } });
  if (rows.length === 0) return undefined;
  return rows[Math.floor(Math.random() * rows.length)]; // { id, name }
}
