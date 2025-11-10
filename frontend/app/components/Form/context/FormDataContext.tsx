// drt_frontend\app\components\Form\context\FormDataContext.tsx
"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";
import { v4 as uuidv4 } from "uuid";

import {
  FormDataService,
  type ChildRecord,
  type ParentFormData,
} from "../domain/form-data";

type ChildrenData = ChildRecord[];

interface FormDataContextType {
  parentFormData: ParentFormData;
  setParentFormData: React.Dispatch<React.SetStateAction<ParentFormData>>;

  childrenData: ChildrenData;
  setChildrenData: React.Dispatch<React.SetStateAction<ChildrenData>>;

  createNewChild: (parentId: string, childStepId: string) => ChildRecord;
  editExistingChild: (parentId: string, childId: string) => ChildRecord | null;
  saveChildData: (
    parentId: string,
    childId: string,
    newData: Record<string, any>
  ) => void;

  getChildById: (parentId: string, childId: string) => ChildRecord | null;
  updateChildById: (
    parentId: string,
    childId: string,
    newData: Record<string, any>
  ) => void;

  deleteChild: (childId: string, parentId: string, childStepId: string) => void;

  // Additional utility functions
  getChildrenByParentId: (parentId: string) => ChildRecord[];
  getChildrenByParentAndStep: (
    parentId: string,
    stepId: string
  ) => ChildRecord[];
  clearParentData: (parentId: string) => void;
  clearAllData: () => void;
}

const STORAGE_KEY = "parentFormData";

const FormDataContext = createContext<FormDataContextType | undefined>(
  undefined
);

export function FormDataProvider({
  children,
  initialParentData = {},
  initialChildrenData = [],
}: {
  children: React.ReactNode;
  initialParentData?: ParentFormData;
  initialChildrenData?: ChildrenData;
}) {
  // Service instance (stable)
  const serviceRef = useRef(new FormDataService(uuidv4));

  // Bootstrap from sessionStorage on client, or use provided initial data on server
  const [parentFormData, setParentFormData] = useState<ParentFormData>(() => {
    if (typeof window === "undefined") return initialParentData;
    try {
      const saved = window.sessionStorage.getItem(STORAGE_KEY);
      return saved ? (JSON.parse(saved) as ParentFormData) : initialParentData;
    } catch {
      return initialParentData;
    }
  });

  // Keep a flat cache for compatibility; derive from parentFormData when it changes
  const derivedChildren = useMemo(
    () => serviceRef.current.listAllChildren(parentFormData),
    [parentFormData]
  );

  const [childrenData, setChildrenData] = useState<ChildrenData>(
    initialChildrenData.length ? initialChildrenData : derivedChildren
  );

  // Persist on every parentFormData change + refresh childrenData cache
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(parentFormData)
        );
      } catch {
        // Storage can fail (quota/private mode); fail gracefully.
      }
    }
    setChildrenData(derivedChildren);
  }, [parentFormData, derivedChildren]);

  /** ------------------------- Command handlers (thin wrappers) ------------------------- */

  const createNewChild = useCallback(
    (parentId: string, stepId: string) => {
      const { next, child } = serviceRef.current.createNewChild(
        parentFormData,
        parentId,
        stepId
      );
      setParentFormData(next);
      return child;
    },
    [parentFormData]
  );

  const editExistingChild = useCallback(
    (parentId: string, childId: string) => {
      return serviceRef.current.editExistingChild(
        parentFormData,
        parentId,
        childId
      );
    },
    [parentFormData]
  );

  const saveChildData = useCallback(
    (parentId: string, childId: string, newData: Record<string, any>) => {
      setParentFormData((prev) =>
        serviceRef.current.saveChildData(prev, parentId, childId, newData)
      );
    },
    []
  );

  const getChildById = useCallback(
    (parentId: string, childId: string) => {
      return serviceRef.current.getChildById(parentFormData, parentId, childId);
    },
    [parentFormData]
  );

  const updateChildById = useCallback(
    (parentId: string, childId: string, newData: Record<string, any>) => {
      setParentFormData((prev) =>
        serviceRef.current.updateChildById(prev, parentId, childId, newData)
      );
    },
    []
  );

  const deleteChild = useCallback(
    (childId: string, parentId: string, childStepId: string) => {
      setParentFormData((prev) =>
        serviceRef.current.deleteChild(prev, childId, parentId, childStepId)
      );
    },
    []
  );

  const getChildrenByParentId = useCallback(
    (parentId: string) => {
      return serviceRef.current.getChildrenByParentId(parentFormData, parentId);
    },
    [parentFormData]
  );

  const getChildrenByParentAndStep = useCallback(
    (parentId: string, stepId: string) => {
      return serviceRef.current.getChildrenByParentAndStep(
        parentFormData,
        parentId,
        stepId
      );
    },
    [parentFormData]
  );

  const clearParentData = useCallback((parentId: string) => {
    setParentFormData((prev) =>
      serviceRef.current.clearParentData(prev, parentId)
    );
  }, []);

  const clearAllData = useCallback(() => {
    setParentFormData(serviceRef.current.clearAllData());
    setChildrenData([]);
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const value: FormDataContextType = {
    parentFormData,
    setParentFormData,
    childrenData,
    setChildrenData,
    createNewChild,
    editExistingChild,
    saveChildData,
    getChildById,
    updateChildById,
    deleteChild,
    getChildrenByParentId,
    getChildrenByParentAndStep,
    clearParentData,
    clearAllData,
  };

  return (
    <FormDataContext.Provider value={value}>
      {children}
    </FormDataContext.Provider>
  );
}

export function useFormData() {
  const context = useContext(FormDataContext);
  if (!context)
    throw new Error("useFormData must be used within a FormDataProvider");
  return context;
}
