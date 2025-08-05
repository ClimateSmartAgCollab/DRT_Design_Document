import { Step } from '../type';
import { asRoot, normalizeEntryCodes } from './utils/helpers';
import { extractPresentations } from './parsers/presentation-parser';
import { parseRelationships } from './relationships/relationship-parser';
import { getOverlayData, getStepMeta } from './overlays/overlay-extractor';
import { buildFields } from './parsers/field-builder';
import { parsePresentation } from './parsers/presentation-parser';
import { ParserConfig } from './types/parser-types';

export const parseJsonToFormStructure = (
  dynamicMetadataJson?: any,
  config: ParserConfig = {}
): Step[] => {
  const { debug = false } = config;
  
  if (debug) {
    console.log('Starting OCA metadata parsing...', dynamicMetadataJson);
  }

  if (!dynamicMetadataJson) {
    console.warn('No metadata JSON provided to parseJsonToFormStructure');
    return [];
  }

  try {
    const metadata = asRoot(dynamicMetadataJson);
    const { bundle, dependencies } = metadata.oca_bundle;
    
    if (config.normalizeEntryCodes !== false) {
      normalizeEntryCodes(dependencies);
    }

    const { presentations, mainCaptureBase, mainTitle } = extractPresentations(metadata);

    if (!presentations.length) {
      console.warn('No presentations found in the OCA package.');
      return [];
    }

    if (debug) {
      console.log(`Found ${presentations.length} presentations, main capture base: ${mainCaptureBase}`);
    }

    const allSteps: Record<string, Step> = {};

    presentations.forEach((presentation) => {
      if (debug) {
        console.log(`Processing presentation for capture base: ${presentation.capture_base}`);
      }

      const relationships = parseRelationships(bundle, dependencies, presentation);

      Object.entries(relationships).forEach(([capBase, rel]) => {
        if (debug) {
          console.log(`Processing entity: ${capBase}, parent: ${rel.parent}, children: ${rel.children.length}`);
        }

        const overlayData = getOverlayData(capBase, bundle, dependencies, presentations);
        
        const { names, descriptions } = getStepMeta(capBase, bundle, dependencies);

        const fieldIds = Object.keys(overlayData.labels.eng ?? {});
        const fields = buildFields(fieldIds, overlayData, rel.refsMap);

        const stepPresentation = presentations.find(p => p.capture_base === capBase) || presentation;
        
        const pages = parsePresentation(stepPresentation, overlayData.labels, fields);

        if (!allSteps[capBase]) {
          allSteps[capBase] = {
            id: capBase,
            title: capBase === mainCaptureBase ? mainTitle : undefined,
            names,
            descriptions,
            parent: rel.parent,
            pages,
          };
        } else {
          const existingPages = new Set(allSteps[capBase].pages.map((p) => p.pageKey));
          const newPages = pages.filter((p) => !existingPages.has(p.pageKey));
          allSteps[capBase].pages.push(...newPages);
        }
      });
    });

    const result = Object.values(allSteps);
    
    if (debug) {
      console.log(`Parsing complete. Generated ${result.length} steps.`);
    }

    return result;

  } catch (error) {
    console.error('Error parsing OCA metadata:', error);
    return [];
  }
};