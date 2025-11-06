// drt_frontend/app/components/parser/utils/entity-lookup.ts
import { Bundle, Dependency, AdcForm, ArgumentType } from "../../type";
import { EntityLookupResult } from "../types/parser-types";
import { Lang } from "./helpers";

export class EntityLocator {
  findByCaptureBase(
    captureBase: string,
    bundle: Bundle,
    dependencies: Dependency[]
  ): EntityLookupResult {
    if (bundle.capture_base.d === captureBase) return bundle;

    const depByCap = dependencies.find(
      (dep) => dep.capture_base.d === captureBase
    );
    if (depByCap) return depByCap;

    const depByD = dependencies.find((dep) => dep.d === captureBase);
    return depByD ?? null;
  }

  getInteractionArgs(
    captureBase: string,
    presentations: AdcForm[] | undefined,
    preferredLanguage?: string
  ): Record<string, ArgumentType> {
    if (!presentations) return {};
    
    
    if (preferredLanguage) {
      const langSpecificPresentation = presentations.find(
        (p) => p.capture_base === captureBase && Lang.normalize(p.language) === preferredLanguage
      );
      if (langSpecificPresentation?.interaction?.[0]?.arguments) {
        return langSpecificPresentation.interaction[0].arguments;
      }
    }
    
    // Fallback to any presentation for this capture base
    const presentation = presentations.find(
      (p) => p.capture_base === captureBase
    );
    return presentation?.interaction?.[0]?.arguments ?? {};
  }

  exists(
    captureBase: string,
    bundle: Bundle,
    dependencies: Dependency[]
  ): boolean {
    return this.findByCaptureBase(captureBase, bundle, dependencies) !== null;
  }

  getAllCaptureBases(bundle: Bundle, dependencies: Dependency[]): string[] {
    return [
      bundle.capture_base.d,
      ...dependencies.map((d) => d.capture_base.d),
    ];
  }
}

export const DefaultEntityLocator = new EntityLocator();
