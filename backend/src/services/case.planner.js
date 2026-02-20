import fs from 'fs/promises';
import path from 'path';
import { v4 as uuid } from 'uuid';
import pool from '../config/database.js';
import { getRouteSteps, getStepOptions, getNextCityByCase } from '../repositories/route.repo.js';
import { getCulpritByCase } from '../repositories/suspect.repo.js';
import { getAllPlaceTypes } from '../repositories/visit.repo.js';
import { generateClue } from './clue.generator.service.js';
import { findProfileById } from '../repositories/profile.repo.js';

// Categories for City Topics
const TOPICS = ['História', 'Geografia', 'Economia', 'Culinária', 'Arte', 'Religião', 'Costumes', 'Bandeira'];
const PLAN_DIR = '/home/user/workspace/data/cases';

async function ensureDir() {
  try {
    await fs.mkdir(PLAN_DIR, { recursive: true });
  } catch (e) {
    // ignore
  }
}

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function planAndGenerateCase(caseId, profileId) {
    console.log('[Planner] Starting planning for case:', caseId);
    await ensureDir();

    const routeSteps = await getRouteSteps(caseId);
    const culprit = await getCulpritByCase(caseId);
    const allPlaceTypes = await getAllPlaceTypes();
    
    const stats = await findProfileById(profileId);
    let reputation = "NEUTRA";
    if (stats && stats.reputation_score > 1000) reputation = "ALTA";
    if (stats && stats.reputation_score < 0) reputation = "BAIXA";

    const villainAttrs = [
        { key: "vehicle", label: culprit.vehicle, ref: culprit.vehicle_id },
        { key: "hobby", label: culprit.hobby, ref: culprit.hobby_id },
        { key: "hair", label: culprit.hair, ref: culprit.hair_id },
        { key: "feature", label: culprit.feature, ref: culprit.feature_id },
        { key: "sex", label: culprit.sex, ref: null }
    ].filter(a => a.label);
    
    const shuffledAttrs = shuffleArray(villainAttrs);
    
    const plan = {
        caseId,
        cities: {}
    };

    const tasks = [];

    for (let i = 0; i < routeSteps.length; i++) {
        const step = routeSteps[i];
        const currentCityId = step.city_id;
        const isFinalStep = (i === routeSteps.length - 1);
        const nextCorrectCity = isFinalStep ? null : routeSteps[i+1]; 
        
        const stepAttr = shuffledAttrs[i % shuffledAttrs.length];
        const stepTopics = shuffleArray(TOPICS).slice(0, 2);
        
        // Correct City Task
        tasks.push(generateCityContent({
            cityId: currentCityId,
            mode: isFinalStep ? 'final' : 'primary',
            nextCity: nextCorrectCity,
            villainAttr: stepAttr,
            topics: stepTopics,
            allPlaceTypes,
            reputation,
            caseId,
            culprit,
            stepOrder: i
        }));

        // Decoy Task
        if (i > 0) {
            const prevStep = routeSteps[i-1];
            const optionsJson = typeof prevStep.clues_generated_json === 'string' 
                ? JSON.parse(prevStep.clues_generated_json) 
                : prevStep.clues_generated_json;
            
            if (optionsJson && Array.isArray(optionsJson.options)) {
                const decoys = optionsJson.options.filter(cId => cId !== currentCityId);
                for (const decoyId of decoys) {
                    tasks.push(generateCityContent({
                        cityId: decoyId,
                        mode: 'decoy',
                        nextCity: null,
                        villainAttr: null,
                        topics: [],
                        allPlaceTypes,
                        reputation,
                        caseId,
                        culprit,
                        stepOrder: i 
                    }));
                }
            }
        }
    }

    const results = await Promise.all(tasks);
    results.forEach(res => {
        if (res) plan.cities[res.cityId] = res.data;
    });

    const filename = path.join(PLAN_DIR, `${caseId}.json`);
    await fs.writeFile(filename, JSON.stringify(plan, null, 2));
    console.log('[Planner] Plan saved to:', filename);
}

async function generateCityContent({ cityId, mode, nextCity, villainAttr, topics, allPlaceTypes, reputation, caseId, culprit, stepOrder }) {
    const shuffledPlaces = shuffleArray(allPlaceTypes).slice(0, 3);
    const placesData = [];
    const clueAssignments = [];

    if (mode === 'primary') {
        clueAssignments.push({ type: 'VILLAIN', attr: villainAttr });
        clueAssignments.push({ type: 'NEXT', topic: topics[0] });
        clueAssignments.push({ type: 'NEXT', topic: topics[1] });
    } else if (mode === 'decoy') {
        clueAssignments.push({ type: 'WARNING' });
        clueAssignments.push({ type: 'WARNING' });
        clueAssignments.push({ type: 'WARNING' });
    } else if (mode === 'final') {
        clueAssignments.push({ type: 'CAPTURE' });
        clueAssignments.push({ type: 'WARNING' });
        clueAssignments.push({ type: 'WARNING' });
    }
    
    const shuffledClues = shuffleArray(clueAssignments);
    const [[cityRow]] = await pool.query('SELECT name, country_id FROM cities WHERE id = ?', [cityId]);
    const cityName = cityRow ? cityRow.name : 'Desconhecida';
    let nextCityName = null;
    let nextCountryName = null;
    
    if (nextCity) {
        const [[nRow]] = await pool.query('SELECT c.name, co.name as country FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.id = ?', [nextCity.city_id]);
        if (nRow) {
            nextCityName = nRow.name;
            nextCountryName = nRow.country;
        }
    }

    for (let i = 0; i < 3; i++) {
        const placeType = shuffledPlaces[i];
        const assignment = shuffledClues[i];
        
        let targetType = 'NONE';
        let targetValue = null;
        let resolvedValue = null; // NEW: For Villain Attr
        let clueType = 'NONE';
        let topicCategory = null;

        if (assignment.type === 'VILLAIN') {
            clueType = 'VILLAIN_ATTRIBUTE';
            targetType = 'VILLAIN_ATTR';
            targetValue = assignment.attr.key;
            resolvedValue = assignment.attr.label; // Pass the actual value (Red, Convertible)
        } else if (assignment.type === 'NEXT') {
            clueType = 'NEXT_LOCATION';
            targetType = 'CITY';
            targetValue = `${nextCityName}, ${nextCountryName}`;
            topicCategory = assignment.topic;
        } else if (assignment.type === 'WARNING') {
            clueType = 'WARNING';
        } else if (assignment.type === 'CAPTURE') {
            clueType = 'CAPTURE';
        }

        let generatedText = "Erro na geração.";
        try {
             const context = {
                 city: cityName,
                 mode: mode,
                 clue_type: clueType,
                 truth: { targetType, targetValue },
                 topicCategory,
                 villainSex: culprit.sex
             };
             
             const result = await generateClue({
                 archetype: placeType.interaction_style,
                 reputation,
                 clueData: { 
                     clue_type: clueType, 
                     target_type: targetType, 
                     target_value: targetValue,
                     resolved_value: resolvedValue // Passed correctly now
                 },
                 context
             });
             generatedText = result.text;
        } catch (e) {
            console.error('AI Gen Error:', e);
            generatedText = "O sistema de comunicação falhou.";
        }

        placesData.push({
            placeTypeId: placeType.id,
            placeTypeName: placeType.name,
            interactionStyle: placeType.interaction_style,
            clueType: assignment.type === 'NEXT' ? 'NEXT_LOCATION' : assignment.type, // Map back to DB enum
            targetType,
            targetValue,
            topicCategory,
            generatedText,
            targetRefId: assignment.attr ? assignment.attr.ref : null
        });
    }

    return { cityId, data: { places: placesData } };
}
