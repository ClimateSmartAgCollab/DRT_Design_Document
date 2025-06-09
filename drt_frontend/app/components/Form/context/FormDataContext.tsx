// drt_frontend\app\components\Form\context\FormDataContext.tsx
"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
} from "react";
import { v4 as uuidv4 } from "uuid";

export interface ChildRecord {
  id: string;
  parentId: string;
  stepId: string;
  data: { [fieldId: string]: any };
}

export interface ParentRecord {
  [fieldId: string]: any;
  childrenData?: {
    [childStepId: string]: ChildRecord[];
  };
}

export interface ParentFormData {
  [parentId: string]: ParentRecord;
}

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
}

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
  const [parentFormData, setParentFormData] =
    useState<ParentFormData>(initialParentData);
  const [childrenData, setChildrenData] =
    useState<ChildrenData>(initialChildrenData);

  const createNewChild = useCallback((parentId: string, stepId: string) => {
    const newChild: ChildRecord = {
      id: uuidv4(),
      parentId,
      stepId: stepId || "defaultStepId",
      data: {},
    };

    setParentFormData((prev) => {
      const parentRecord = prev[parentId] || {};
      const currentChildren = parentRecord.childrenData?.[stepId] || [];
      const updatedChildren = [...currentChildren, newChild];

      return {
        ...prev,
        [parentId]: {
          ...parentRecord,
          childrenData: {
            ...(parentRecord.childrenData || {}),
            [stepId]: updatedChildren,
          },
        },
      };
    });

    return newChild;
  }, []);

  const editExistingChild = useCallback(
    (parentId: string, childId: string) => {
      const parentRecord = parentFormData[parentId];
      if (!parentRecord || !parentRecord.childrenData) return null;

      for (const childStep in parentRecord.childrenData) {
        const child = parentRecord.childrenData[childStep].find(
          (c) => c.id === childId
        );
        if (child) return child;
      }
      return null;
    },
    [parentFormData]
  );

  const saveChildData = useCallback(
    (parentId: string, childId: string, newData: Record<string, any>) => {
      setParentFormData((prev) => {
        const parentRecord = prev[parentId];
        if (!parentRecord || !parentRecord.childrenData) return prev;

        const updatedChildrenData = { ...parentRecord.childrenData };

        for (const childStep in updatedChildrenData) {
          const childrenArray = updatedChildrenData[childStep];
          const idx = childrenArray.findIndex((c) => c.id === childId);
          if (idx !== -1) {
            childrenArray[idx] = {
              ...childrenArray[idx],
              data: { ...childrenArray[idx].data, ...newData },
            };
            break;
          }
        }
        return {
          ...prev,
          [parentId]: {
            ...parentRecord,
            childrenData: updatedChildrenData,
          },
        };
      });
    },
    []
  );

  const getChildById = useCallback(
    (parentId: string, childId: string) => {
      const parentRecord = parentFormData[parentId];
      if (!parentRecord || !parentRecord.childrenData) return null;

      for (const childStep in parentRecord.childrenData) {
        const child = parentRecord.childrenData[childStep].find(
          (c) => c.id === childId
        );
        if (child) return child;
      }
      return null;
    },
    [parentFormData]
  );

  const updateChildById = useCallback(
    (parentId: string, childId: string, newData: Record<string, any>) => {
      setParentFormData((prev) => {
        const parentRecord = prev[parentId];
        if (!parentRecord || !parentRecord.childrenData) return prev;

        const updatedChildrenData = { ...parentRecord.childrenData };

        for (const childStep in updatedChildrenData) {
          const childrenArray = updatedChildrenData[childStep];
          const idx = childrenArray.findIndex((c) => c.id === childId);
          if (idx !== -1) {
            childrenArray[idx] = {
              ...childrenArray[idx],
              data: { ...childrenArray[idx].data, ...newData },
            };
            break;
          }
        }
        return {
          ...prev,
          [parentId]: {
            ...parentRecord,
            childrenData: updatedChildrenData,
          },
        };
      });
    },
    []
  );

  const deleteChild = useCallback(
    (childId: string, parentId: string, childStepId: string) => {
      setParentFormData((prev) => {
        const parentRecord = prev[parentId];
        if (
          !parentRecord ||
          !parentRecord.childrenData ||
          !parentRecord.childrenData[childStepId]
        ) {
          return prev;
        }

        const updatedChildren = parentRecord.childrenData[childStepId].filter(
          (c) => c.id !== childId
        );

        return {
          ...prev,
          [parentId]: {
            ...parentRecord,
            childrenData: {
              ...parentRecord.childrenData,
              [childStepId]: updatedChildren,
            },
          },
        };
      });
    },
    []
  );

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
  };

  return (
    <FormDataContext.Provider value={value}>
      {children}
    </FormDataContext.Provider>
  );
}

export function useFormData() {
  const context = useContext(FormDataContext);
  if (!context) {
    throw new Error("useFormData must be used within a FormDataProvider");
  }
  return context;
}
