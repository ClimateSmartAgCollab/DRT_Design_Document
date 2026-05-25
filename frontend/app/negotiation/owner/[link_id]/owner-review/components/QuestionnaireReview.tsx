import React from "react";
import { Field } from "../../../../../components/type";
import { OwnerCommentVersion } from "../types";
import { OwnerCommentVersions } from "./OwnerCommentVersions";

interface QuestionnaireReviewProps {
  parentSteps: any[];
  parsedSteps: any[];
  currentData: any;
  fieldComments: Record<string, string>;
  setFieldComments: (comments: Record<string, string>) => void;
  isViewingHistory: boolean;
  ownerCommentVersions?: OwnerCommentVersion[];
}

export function QuestionnaireReview({
  parentSteps,
  parsedSteps,
  currentData,
  fieldComments,
  setFieldComments,
  isViewingHistory,
  ownerCommentVersions,
}: QuestionnaireReviewProps) {
  if (
    !currentData?.requestor_responses ||
    Object.keys(currentData.requestor_responses).length === 0
  ) {
    return null;
  }

  return (
    <>
      {parentSteps.map((step) => (
        <section key={step.id} className="space-y-4">
          {step.title && (
            <h3 className="text-xl font-semibold">{step.title.eng}</h3>
          )}
          {step.pages.map((page: any) =>
            page.sections.map((sec: any) => (
              <div
                key={sec.sectionKey}
                className="pl-4 border-l-2 border-gray-200"
              >
                <h4 className="text-lg font-medium mb-2">
                  {sec.sectionLabel.eng}
                </h4>
                {sec.fields.map((field: Field) => {
                  const hasChildrenData =
                    currentData?.requestor_responses?.[field.id]
                      ?.childrenData?.[field.ref!]?.length > 0;

                  if (hasChildrenData) {
                    return (
                      <div key={field.id} className="mb-4">
                        <label className="block font-medium mb-1">
                          {field.labels.eng?.[field.id] || field.id}
                        </label>
                        <div className="ml-4 mt-2 border-l-4 p-2 border-[rgb(70,160,35)]">
                          <h5 className="text-md font-semibold text-[rgb(70,160,35)]">
                            Child Entries for &quot;
                            {field.labels.eng?.[field.id] || field.id}&quot;
                          </h5>
                          {currentData?.requestor_responses?.[
                            field.id
                          ]?.childrenData?.[field.ref!]?.map(
                            (child: any, index: number) => {
                              const childStep =
                                parentSteps.find((s) => s.id === child.stepId) ||
                                parsedSteps.find((s) => s.id === child.stepId);
                              return (
                                <div
                                  key={child.id}
                                  className="mt-2 p-2 bg-[rgba(180,230,160,0.2)]"
                                >
                                  <h6 className="text-sm font-medium text-gray-700 mb-2">
                                    Entry {index + 1}
                                  </h6>
                                  {childStep ? (
                                    childStep.pages.map((cPage: any) => (
                                      <div key={cPage.pageKey} className="ml-4">
                                        {cPage.sections.map((cSection: any) => (
                                          <div
                                            key={cSection.sectionKey}
                                            className="ml-4 mb-4"
                                          >
                                            <h6 className="text-lg font-medium">
                                              {cSection.sectionLabel.eng}
                                            </h6>
                                            {cSection.fields.map(
                                              (cField: any) => {
                                                const childAnswer =
                                                  child.data[cField.id];
                                                return (
                                                  <div
                                                    key={cField.id}
                                                    className="mb-1 ml-4 break-words"
                                                  >
                                                    <strong>
                                                      {cField.labels.eng?.[
                                                        cField.id
                                                      ] || cField.id}
                                                      :{" "}
                                                    </strong>
                                                    <span className="text-gray-600">
                                                      {Array.isArray(
                                                        childAnswer
                                                      )
                                                        ? childAnswer.join(", ")
                                                        : childAnswer?.toString() ||
                                                          "No response provided"}
                                                    </span>
                                                  </div>
                                                );
                                              }
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    ))
                                  ) : (
                                    <p className="ml-4 text-gray-600">
                                      No child structure found.
                                    </p>
                                  )}
                                </div>
                              );
                            }
                          )}
                        </div>
                        {/* Owner comments for child data */}
                        {isViewingHistory &&
                        ownerCommentVersions &&
                        ownerCommentVersions.length > 0 ? (
                          <OwnerCommentVersions
                            fieldId={field.id}
                            ownerCommentVersions={ownerCommentVersions}
                          />
                        ) : !isViewingHistory ? (
                          <>
                            <textarea
                              placeholder="Owner comment…"
                              value={fieldComments[field.id] || ""}
                              onChange={(e) =>
                                setFieldComments({
                                  ...fieldComments,
                                  [field.id]: e.target.value,
                                })
                              }
                              disabled={isViewingHistory}
                              className="w-full border rounded p-2 mt-2"
                            />
                            {/* Show comment history on latest page */}
                            {ownerCommentVersions && ownerCommentVersions.length > 0 && (
                              <OwnerCommentVersions
                                fieldId={field.id}
                                ownerCommentVersions={ownerCommentVersions}
                              />
                            )}
                          </>
                        ) : fieldComments[field.id] ? (
                          <div className="mt-2">
                            <div className="bg-gray-50 p-3 rounded border">
                              <div className="font-medium text-sm text-gray-700 mb-1">
                                Owner Comments:
                              </div>
                              <div className="text-sm text-gray-800">
                                {fieldComments[field.id]}
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  }

                  // For regular fields, flatten nested responses
                  const flat = Object.entries(
                    currentData?.requestor_responses || {}
                  ).reduce((acc, [k, v]) => {
                    if (v && typeof v === "object" && !Array.isArray(v)) {
                      return { ...acc, ...v };
                    }
                    acc[k] = v;
                    return acc;
                  }, {} as Record<string, any>);
                  const answer = flat[field.id];

                  return (
                    <div key={field.id} className="mb-4">
                      <label className="block font-medium mb-1">
                        {field.labels.eng?.[field.id] || field.id}
                      </label>
                      <div className="p-2 bg-gray-100 rounded mb-2 break-words">
                        {Array.isArray(answer)
                          ? answer.join(", ")
                          : String(answer ?? "—")}
                      </div>
                      {/* Owner comments for regular fields */}
                      {isViewingHistory &&
                      ownerCommentVersions &&
                      ownerCommentVersions.length > 0 ? (
                        <OwnerCommentVersions
                          fieldId={field.id}
                          ownerCommentVersions={ownerCommentVersions}
                        />
                      ) : !isViewingHistory ? (
                        <>
                          <textarea
                            placeholder="Owner comment…"
                            value={fieldComments[field.id] || ""}
                            onChange={(e) =>
                              setFieldComments({
                                ...fieldComments,
                                [field.id]: e.target.value,
                              })
                            }
                            disabled={isViewingHistory}
                            className="w-full border rounded p-2"
                          />
                          {/* Show comment history on latest page */}
                          {ownerCommentVersions && ownerCommentVersions.length > 0 && (
                            <OwnerCommentVersions
                              fieldId={field.id}
                              ownerCommentVersions={ownerCommentVersions}
                            />
                          )}
                        </>
                      ) : fieldComments[field.id] ? (
                        <div className="bg-gray-50 p-3 rounded border">
                          <div className="font-medium text-sm text-gray-700 mb-1">
                            Owner Comments:
                          </div>
                          <div className="text-sm text-gray-800">
                            {fieldComments[field.id]}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </section>
      ))}
    </>
  );
}
