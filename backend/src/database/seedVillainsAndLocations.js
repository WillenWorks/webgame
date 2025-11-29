// src/database/seedVillainsAndLocations.js
import dotenv from "dotenv";
import { getDbPool } from "./database.js";

dotenv.config();

async function seedVillainsAndLocations() {
  const pool = getDbPool();
  const conn = await pool.getConnection();

  try {
    console.log("🔄 Iniciando seed de villains e locations...");

    // Verifica se já tem vilões
    const [villainCountRows] = await conn.query(
      "SELECT COUNT(*) as total FROM villain_templates"
    );
    const villainCount = villainCountRows[0].total;

    if (villainCount === 0) {
      console.log("➡️ Nenhum vilão encontrado. Inserindo vilões base...");

      const villains = [
        {
          code: "suspect_carlos_monaco",
          name: "Carlos Monaco",
          sex: "male",
          occupation: "Art Dealer",
          hobby: "High-stakes poker",
          hair_color: "black",
          vehicle: "black sports car",
          feature: "cicatriz discreta perto da sobrancelha direita",
          other: "ligado a leilões ilegais e falsificação de arte",
          danger_level: 3,
        },
        {
          code: "suspect_elena_raven",
          name: "Elena Raven",
          sex: "female",
          occupation: "Data Analyst",
          hobby: "Urban photography",
          hair_color: "dark brown",
          vehicle: "motorcycle",
          feature: "tatuagem de corvo no pulso esquerdo",
          other: "especialista em vazamento de dados confidenciais",
          danger_level: 4,
        },
        {
          code: "suspect_otto_valen",
          name: "Otto Valen",
          sex: "male",
          occupation: "Logistics Manager",
          hobby: "Marathon running",
          hair_color: "blond",
          vehicle: "white van",
          feature: "sempre usa relógios digitais enormes",
          other: "suspeito de coordenar rotas de fuga da V.I.L.E.",
          danger_level: 2,
        },
        {
          code: "suspect_mira_caledonia",
          name: "Mira Caledonia",
          sex: "female",
          occupation: "Historian",
          hobby: "Collecting rare coins",
          hair_color: "red",
          vehicle: "compact car",
          feature: "óculos de armação grossa e lenços coloridos",
          other: "obcecada por artefatos históricos raros",
          danger_level: 3,
        },
        {
          code: "suspect_jonas_oberon",
          name: "Jonas Oberon",
          sex: "male",
          occupation: "Security Consultant",
          hobby: "Chess",
          hair_color: "grey",
          vehicle: "sedan",
          feature: "andar calmo, sempre de luvas",
          other: "usa conhecimento de segurança para explorar falhas",
          danger_level: 4,
        },
        {
          code: "suspect_ayumi_kato",
          name: "Ayumi Kato",
          sex: "female",
          occupation: "Cybersecurity Engineer",
          hobby: "Retro videogames",
          hair_color: "black",
          vehicle: "electric scooter",
          feature: "fone de ouvido sempre pendurado no pescoço",
          other:
            "já trabalhou protegendo bancos que agora são alvo da V.I.L.E.",
          danger_level: 4,
        },
        {
          code: "suspect_rafael_silva",
          name: "Rafael Silva",
          sex: "male",
          occupation: "Documentary Filmmaker",
          hobby: "Street art",
          hair_color: "brown",
          vehicle: "old hatchback",
          feature: "anda com câmera analógica pendurada",
          other: "usa filmagens como cobertura para mapear rotas de fuga",
          danger_level: 2,
        },
        {
          code: "suspect_helena_morozov",
          name: "Helena Morozov",
          sex: "female",
          occupation: "Cryptographer",
          hobby: "Classical piano",
          hair_color: "black",
          vehicle: "dark sedan",
          feature: "luva de couro na mão esquerda",
          other:
            "reconhecida por quebrar cifras governamentais em tempo recorde",
          danger_level: 5,
        },
        {
          code: "suspect_liam_o_connor",
          name: "Liam O'Connor",
          sex: "male",
          occupation: "Pilot",
          hobby: "Rock climbing",
          hair_color: "auburn",
          vehicle: "private plane",
          feature: "cicatriz visível no queixo",
          other: "costuma pilotar rotas não oficiais pelo mundo",
          danger_level: 3,
        },
        {
          code: "suspect_samira_nassar",
          name: "Samira Nassar",
          sex: "female",
          occupation: "Art Curator",
          hobby: "Restoration of old books",
          hair_color: "dark brown",
          vehicle: "luxury coupe",
          feature: "anel de pedra verde chamativo",
          other:
            "move obras de arte entre coleções privadas sem muitos registros oficiais",
          danger_level: 3,
        },
      ];

      for (const v of villains) {
        await conn.query(
          `INSERT INTO villain_templates
          (code, name, sex, occupation, hobby, hair_color, vehicle, feature, other, danger_level)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            v.code,
            v.name,
            v.sex,
            v.occupation,
            v.hobby,
            v.hair_color,
            v.vehicle,
            v.feature,
            v.other,
            v.danger_level,
          ]
        );
      }

      console.log(`✅ Inseridos ${villains.length} vilões base.`);
    } else {
      console.log(
        `ℹ️ Já existem ${villainCount} vilões. Seed de vilões ignorado.`
      );
    }

    // Verifica se já tem locations
    const [locCountRows] = await conn.query(
      "SELECT COUNT(*) as total FROM locations"
    );
    const locCount = locCountRows[0].total;

    if (locCount === 0) {
      console.log(
        "➡️ Nenhuma location encontrada. Inserindo locations base..."
      );

      const locations = [
        {
          code: "monaco_city",
          name: "Monaco",
          type: "city",
          country: "Monaco",
          region: "Europe",
          description:
            "Pequeno principado famoso por cassinos e corridas de F1.",
        },
        {
          code: "paris",
          name: "Paris",
          type: "city",
          country: "France",
          region: "Europe",
          description:
            "Capital francesa, conhecida pela Torre Eiffel e museus de arte.",
        },
        {
          code: "london",
          name: "London",
          type: "city",
          country: "United Kingdom",
          region: "Europe",
          description:
            "Centro financeiro e cultural, com clima eternamente confuso.",
        },
        {
          code: "rome",
          name: "Rome",
          type: "city",
          country: "Italy",
          region: "Europe",
          description:
            "Cidade histórica repleta de ruínas romanas e arte renascentista.",
        },
        {
          code: "berlin",
          name: "Berlin",
          type: "city",
          country: "Germany",
          region: "Europe",
          description:
            "Capital alemã, mistura de história pesada e cena alternativa.",
        },
        {
          code: "new_york",
          name: "New York",
          type: "city",
          country: "United States",
          region: "North America",
          description:
            "Cidade que nunca dorme, cheia de oportunidades e sirenes.",
        },
        {
          code: "tokyo",
          name: "Tokyo",
          type: "city",
          country: "Japan",
          region: "Asia",
          description:
            "Metrópole de neon, tecnologia e tradições bem preservadas.",
        },
        {
          code: "sao_paulo",
          name: "São Paulo",
          type: "city",
          country: "Brazil",
          region: "South America",
          description:
            "Cidade gigante, caótica e criativa, com trânsito lendário.",
        },
        {
          code: "cairo",
          name: "Cairo",
          type: "city",
          country: "Egypt",
          region: "Africa",
          description: "Ponto de acesso às pirâmides e ao Nilo.",
        },
        {
          code: "sydney",
          name: "Sydney",
          type: "city",
          country: "Australia",
          region: "Oceania",
          description: "Cidade costeira famosa pela Opera House e praias.",
        },
      ];

      for (const loc of locations) {
        await conn.query(
          `INSERT INTO locations
          (code, name, type, country, region, description)
          VALUES (?, ?, ?, ?, ?, ?)`,
          [
            loc.code,
            loc.name,
            loc.type,
            loc.country,
            loc.region,
            loc.description,
          ]
        );
      }

      console.log(`✅ Inseridas ${locations.length} locations base.`);
    } else {
      console.log(`ℹ️ Já existem ${locCount} locations. Seed ignorado.`);
    }

    conn.release();
    console.log("✨ Seed concluído.");
  } catch (err) {
    console.error("❌ Erro ao rodar seed:", err);
    conn.release();
    process.exit(1);
  }
}

seedVillainsAndLocations();
