// drt_frontend\app\components\Form\Form.tsx
"use client";

import FormWrapper from "./FormWrapper";
import type { FormProps } from "./types";

interface FormComponentProps extends FormProps {
  questionnaireJson?: any; 
}

export default function Form(props: FormComponentProps) {
  return <FormWrapper {...props} />;
}
