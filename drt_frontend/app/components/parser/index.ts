import { Step } from "../type";
import { asRoot, Normalizers } from "./utils/helpers";
import {
  PresentationsExtractor,
  PresentationParser,
} from "./parsers/presentation-parser";
import { RelationshipGraphBuilder } from "./relationships/relationship-parser";
import {
  OverlayExtractor,
  OverlaySnapshot,
} from "./overlays/overlay-extractor";
import { FieldFactory } from "./parsers/field-builder";
import { ParserConfig } from "./types/parser-types";
import { DefaultEntityLocator } from "./utils/entity-lookup";

export class FormStructureParser {
  constructor(private readonly config: ParserConfig = {}) {}

  parse(dynamicMetadataJson?: any): Step[] {
    const {
      debug = false,
      normalizeEntryCodes = true,
      defaultLanguage = "eng",
    } = this.config;

    if (debug)
      console.log("Starting OCA metadata parsing...", dynamicMetadataJson);
    if (!dynamicMetadataJson) {
      console.warn("No metadata JSON provided to parseJsonToFormStructure");
      return [];
    }

    try {
      // Root & normalization
      const metadata = asRoot(dynamicMetadataJson);
      const { bundle, dependencies } = metadata.oca_bundle;

      if (normalizeEntryCodes !== false) {
        Normalizers.normalizeEntryCodes(dependencies);
      }

      const { presentations, mainCaptureBase, mainTitle } =
        PresentationsExtractor.extract(metadata);
      if (!presentations.length) {
        console.warn("No presentations found in the OCA package.");
        return [];
      }
      if (debug) {
        console.log(
          `Found ${presentations.length} presentations, main capture base: ${mainCaptureBase}`
        );
      }

      const allSteps: Record<string, Step> = {};

      presentations.forEach((presentation) => {
        if (debug)
          console.log(
            `Processing presentation for capture base: ${presentation.capture_base}`
          );

        const graphMap = new RelationshipGraphBuilder(
          bundle,
          dependencies,
          DefaultEntityLocator,
          debug
        ).buildFromRoot(presentation.capture_base);

        Object.entries(graphMap).forEach(([capBase, rel]) => {
          if (debug) {
            console.log(
              `Processing entity: ${capBase}, parent: ${rel.parent}, children: ${rel.children.length}`
            );
          }

          const extractor = new OverlayExtractor(
            bundle,
            dependencies,
            presentations,
            DefaultEntityLocator,
            defaultLanguage
          );
          const snapshot: OverlaySnapshot = extractor.extract(capBase);
          const overlayData = snapshot.toDTO();
          const { names, descriptions } = extractor.extractStepMeta(capBase);
          const fieldIds = Object.keys(
            overlayData.labels[defaultLanguage] ?? {}
          );
          const fieldFactory = new FieldFactory(snapshot, rel.refsMap);
          const fields = fieldFactory.buildMany(fieldIds);
          const stepPresentation =
            presentations.find((p) => p.capture_base === capBase) ||
            presentation;
          const pages = new PresentationParser(stepPresentation).parse(fields);
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
            const existingPages = new Set(
              allSteps[capBase].pages.map((p) => p.pageKey)
            );
            const newPages = pages.filter((p) => !existingPages.has(p.pageKey));
            allSteps[capBase].pages.push(...newPages);
          }
        });
      });

      const result = Object.values(allSteps);
      if (debug)
        console.log(`Parsing complete. Generated ${result.length} steps.`);
      return result;
    } catch (error) {
      console.error("Error parsing OCA metadata:", error);
      return [];
    }
  }
}

export const parseJsonToFormStructure = (
  dynamicMetadataJson?: any,
  config: ParserConfig = {},
): Step[] => {
  return new FormStructureParser(config).parse(dynamicMetadataJson);
};