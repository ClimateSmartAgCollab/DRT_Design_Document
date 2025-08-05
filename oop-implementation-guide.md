# OOP Implementation Guide for DRT Project
## How to Use Object-Oriented Programming in Your React/TypeScript Project

### Overview
Your DRT project can benefit significantly from OOP principles. This guide shows how to refactor existing code and implement new features using classes, inheritance, encapsulation, and polymorphism.

## 1. Current State Analysis

### 1.1 Current Code Structure
Your DRT project currently uses:
- **Functional Components** with hooks
- **Custom Hooks** for logic reuse
- **Context API** for state management
- **Utility functions** for data processing

### 1.2 OOP Opportunities
- **Data Models**: Form data, questionnaire structure
- **Service Classes**: API calls, storage operations
- **Validation Classes**: Form validation, data validation
- **State Management**: Enhanced context with classes
- **Utility Classes**: Data processing, formatting

## 2. Implementing OOP Patterns

### 2.1 Data Models with Classes

#### **Questionnaire Model**
```typescript
// models/Questionnaire.ts
export class Questionnaire {
  private _id: string;
  private _fields: Field[];
  private _metadata: QuestionnaireMetadata;

  constructor(id: string, fields: Field[], metadata?: Partial<QuestionnaireMetadata>) {
    this._id = id;
    this._fields = fields;
    this._metadata = {
      version: '1.0',
      createdAt: new Date(),
      lastModified: new Date(),
      ...metadata
    };
  }

  // Getters
  get id(): string { return this._id; }
  get fields(): Field[] { return [...this._fields]; } // Return copy for immutability
  get metadata(): QuestionnaireMetadata { return { ...this._metadata }; }

  // Business Logic Methods
  getMandatoryFields(): Field[] {
    return this._fields.filter(field => field.required);
  }

  getFieldsByLevel(level: 'mandatory' | 'recommended' | 'complete'): Field[] {
    return this._fields.filter(field => field.level === level);
  }

  validateField(fieldId: string, value: any): ValidationResult {
    const field = this._fields.find(f => f.id === fieldId);
    if (!field) {
      return { isValid: false, error: 'Field not found' };
    }

    return field.validate(value);
  }

  // Factory Method
  static fromJSON(json: any): Questionnaire {
    return new Questionnaire(
      json.id,
      json.fields.map((f: any) => Field.fromJSON(f)),
      json.metadata
    );
  }

  // Serialization
  toJSON(): any {
    return {
      id: this._id,
      fields: this._fields.map(field => field.toJSON()),
      metadata: this._metadata
    };
  }
}

// models/Field.ts
export abstract class Field {
  protected _id: string;
  protected _label: string;
  protected _required: boolean;
  protected _level: 'mandatory' | 'recommended' | 'complete';

  constructor(id: string, label: string, required: boolean = false, level: 'mandatory' | 'recommended' | 'complete' = 'mandatory') {
    this._id = id;
    this._label = label;
    this._required = required;
    this._level = level;
  }

  // Abstract methods that subclasses must implement
  abstract validate(value: any): ValidationResult;
  abstract render(): React.ReactElement;

  // Common getters
  get id(): string { return this._id; }
  get label(): string { return this._label; }
  get required(): boolean { return this._required; }
  get level(): string { return this._level; }

  // Common validation logic
  protected validateRequired(value: any): ValidationResult {
    if (this._required && (!value || value.toString().trim() === '')) {
      return { isValid: false, error: `${this._label} is required` };
    }
    return { isValid: true };
  }

  // Factory method
  static fromJSON(json: any): Field {
    switch (json.type) {
      case 'text': return TextField.fromJSON(json);
      case 'select': return SelectField.fromJSON(json);
      case 'textarea': return TextAreaField.fromJSON(json);
      default: throw new Error(`Unknown field type: ${json.type}`);
    }
  }

  toJSON(): any {
    return {
      id: this._id,
      label: this._label,
      required: this._required,
      level: this._level,
      type: this.constructor.name.toLowerCase().replace('field', '')
    };
  }
}

// models/TextField.ts
export class TextField extends Field {
  private _maxLength?: number;
  private _pattern?: RegExp;

  constructor(id: string, label: string, required: boolean = false, level: 'mandatory' | 'recommended' | 'complete' = 'mandatory', maxLength?: number, pattern?: RegExp) {
    super(id, label, required, level);
    this._maxLength = maxLength;
    this._pattern = pattern;
  }

  validate(value: any): ValidationResult {
    // Check required first
    const requiredCheck = this.validateRequired(value);
    if (!requiredCheck.isValid) return requiredCheck;

    // If not required and empty, it's valid
    if (!value || value.toString().trim() === '') return { isValid: true };

    const stringValue = value.toString();

    // Check max length
    if (this._maxLength && stringValue.length > this._maxLength) {
      return { isValid: false, error: `${this._label} must be ${this._maxLength} characters or less` };
    }

    // Check pattern
    if (this._pattern && !this._pattern.test(stringValue)) {
      return { isValid: false, error: `${this._label} format is invalid` };
    }

    return { isValid: true };
  }

  render(): React.ReactElement {
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {this._label} {this._required && <span className="text-red-500">*</span>}
        </label>
        <input
          type="text"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          maxLength={this._maxLength}
          pattern={this._pattern?.source}
        />
      </div>
    );
  }

  static fromJSON(json: any): TextField {
    return new TextField(
      json.id,
      json.label,
      json.required,
      json.level,
      json.maxLength,
      json.pattern ? new RegExp(json.pattern) : undefined
    );
  }
}

// models/SelectField.ts
export class SelectField extends Field {
  private _options: SelectOption[];

  constructor(id: string, label: string, options: SelectOption[], required: boolean = false, level: 'mandatory' | 'recommended' | 'complete' = 'mandatory') {
    super(id, label, required, level);
    this._options = options;
  }

  validate(value: any): ValidationResult {
    const requiredCheck = this.validateRequired(value);
    if (!requiredCheck.isValid) return requiredCheck;

    if (!value || value.toString().trim() === '') return { isValid: true };

    const validOptions = this._options.map(opt => opt.value);
    if (!validOptions.includes(value)) {
      return { isValid: false, error: `${this._label} must be one of the available options` };
    }

    return { isValid: true };
  }

  render(): React.ReactElement {
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {this._label} {this._required && <span className="text-red-500">*</span>}
        </label>
        <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500">
          <option value="">Select an option</option>
          {this._options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  static fromJSON(json: any): SelectField {
    return new SelectField(
      json.id,
      json.label,
      json.options,
      json.required,
      json.level
    );
  }
}
```

### 2.2 Service Classes

#### **Storage Service**
```typescript
// services/StorageService.ts
export abstract class StorageService {
  protected abstract storage: Storage;
  protected abstract prefix: string;

  protected getKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  set<T>(key: string, value: T): void {
    try {
      const serialized = JSON.stringify(value);
      this.storage.setItem(this.getKey(key), serialized);
    } catch (error) {
      console.error(`Failed to save ${key} to storage:`, error);
      throw new StorageError(`Failed to save ${key}`, error);
    }
  }

  get<T>(key: string, defaultValue?: T): T | null {
    try {
      const item = this.storage.getItem(this.getKey(key));
      if (item === null) return defaultValue || null;
      return JSON.parse(item);
    } catch (error) {
      console.error(`Failed to load ${key} from storage:`, error);
      this.remove(key); // Clean up corrupted data
      return defaultValue || null;
    }
  }

  remove(key: string): void {
    this.storage.removeItem(this.getKey(key));
  }

  clear(): void {
    const keys = Object.keys(this.storage);
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        this.storage.removeItem(key);
      }
    });
  }

  has(key: string): boolean {
    return this.storage.getItem(this.getKey(key)) !== null;
  }
}

// services/LocalStorageService.ts
export class LocalStorageService extends StorageService {
  protected storage = localStorage;
  protected prefix = 'drt';

  // Specific methods for DRT data
  saveFormData(data: any): void {
    this.set('formData', data);
  }

  getFormData(): any {
    return this.get('formData', {});
  }

  saveQuestionnaire(questionnaire: Questionnaire): void {
    this.set(`questionnaire:${questionnaire.id}`, questionnaire.toJSON());
  }

  getQuestionnaire(id: string): Questionnaire | null {
    const data = this.get(`questionnaire:${id}`);
    return data ? Questionnaire.fromJSON(data) : null;
  }
}

// services/SessionStorageService.ts
export class SessionStorageService extends StorageService {
  protected storage = sessionStorage;
  protected prefix = 'drt-session';

  saveCurrentSession(data: any): void {
    this.set('currentSession', data);
  }

  getCurrentSession(): any {
    return this.get('currentSession', {});
  }
}
```

#### **API Service**
```typescript
// services/ApiService.ts
export abstract class ApiService {
  protected baseURL: string;
  protected defaultHeaders: Record<string, string>;

  constructor(baseURL: string, defaultHeaders: Record<string, string> = {}) {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...defaultHeaders
    };
  }

  protected async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const config: RequestInit = {
      credentials: 'include',
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (response.status >= 500) {
        throw new ApiError(`Server error: ${response.status}`, response.status);
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.message || `HTTP ${response.status}`,
          response.status
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(`Network error: ${error.message}`, 0);
    }
  }

  protected get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  protected post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  protected put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  protected delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// services/QuestionnaireApiService.ts
export class QuestionnaireApiService extends ApiService {
  constructor(baseURL: string) {
    super(baseURL);
  }

  async getQuestionnaire(id: string): Promise<Questionnaire> {
    const data = await this.get<any>(`/questionnaires/${id}`);
    return Questionnaire.fromJSON(data);
  }

  async saveQuestionnaire(questionnaire: Questionnaire): Promise<void> {
    await this.post('/questionnaires', questionnaire.toJSON());
  }

  async submitQuestionnaire(id: string, responses: any): Promise<void> {
    await this.post(`/questionnaires/${id}/submit`, { responses });
  }

  async getQuestionnaireList(): Promise<QuestionnaireSummary[]> {
    return this.get<QuestionnaireSummary[]>('/questionnaires');
  }
}

// services/NegotiationApiService.ts
export class NegotiationApiService extends ApiService {
  constructor(baseURL: string) {
    super(baseURL);
  }

  async getNegotiations(filters?: NegotiationFilters): Promise<Negotiation[]> {
    const params = filters ? new URLSearchParams(filters as any).toString() : '';
    const endpoint = `/negotiations${params ? `?${params}` : ''}`;
    return this.get<Negotiation[]>(endpoint);
  }

  async getNegotiation(id: string): Promise<Negotiation> {
    return this.get<Negotiation>(`/negotiations/${id}`);
  }

  async updateNegotiation(id: string, updates: Partial<Negotiation>): Promise<Negotiation> {
    return this.put<Negotiation>(`/negotiations/${id}`, updates);
  }

  async deleteNegotiation(id: string): Promise<void> {
    await this.delete(`/negotiations/${id}`);
  }
}
```

### 2.3 Validation Classes

#### **Validator System**
```typescript
// validation/Validator.ts
export abstract class Validator<T> {
  abstract validate(value: T): ValidationResult;

  // Chain validators together
  and(other: Validator<T>): Validator<T> {
    return new AndValidator(this, other);
  }

  or(other: Validator<T>): Validator<T> {
    return new OrValidator(this, other);
  }
}

// validation/StringValidator.ts
export class StringValidator extends Validator<string> {
  private minLength?: number;
  private maxLength?: number;
  private pattern?: RegExp;
  private required: boolean;

  constructor(options: {
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    required?: boolean;
  } = {}) {
    super();
    this.minLength = options.minLength;
    this.maxLength = options.maxLength;
    this.pattern = options.pattern;
    this.required = options.required ?? false;
  }

  validate(value: string): ValidationResult {
    // Check required
    if (this.required && (!value || value.trim() === '')) {
      return { isValid: false, error: 'This field is required' };
    }

    // If not required and empty, it's valid
    if (!value || value.trim() === '') return { isValid: true };

    // Check min length
    if (this.minLength && value.length < this.minLength) {
      return { isValid: false, error: `Must be at least ${this.minLength} characters` };
    }

    // Check max length
    if (this.maxLength && value.length > this.maxLength) {
      return { isValid: false, error: `Must be no more than ${this.maxLength} characters` };
    }

    // Check pattern
    if (this.pattern && !this.pattern.test(value)) {
      return { isValid: false, error: 'Invalid format' };
    }

    return { isValid: true };
  }
}

// validation/CompositeValidators.ts
export class AndValidator<T> extends Validator<T> {
  constructor(private left: Validator<T>, private right: Validator<T>) {
    super();
  }

  validate(value: T): ValidationResult {
    const leftResult = this.left.validate(value);
    if (!leftResult.isValid) return leftResult;

    return this.right.validate(value);
  }
}

export class OrValidator<T> extends Validator<T> {
  constructor(private left: Validator<T>, private right: Validator<T>) {
    super();
  }

  validate(value: T): ValidationResult {
    const leftResult = this.left.validate(value);
    if (leftResult.isValid) return leftResult;

    const rightResult = this.right.validate(value);
    if (rightResult.isValid) return rightResult;

    return { isValid: false, error: 'Value does not meet any validation criteria' };
  }
}

// validation/FormValidator.ts
export class FormValidator {
  private validators: Map<string, Validator<any>> = new Map();

  addValidator(fieldName: string, validator: Validator<any>): FormValidator {
    this.validators.set(fieldName, validator);
    return this;
  }

  validateField(fieldName: string, value: any): ValidationResult {
    const validator = this.validators.get(fieldName);
    if (!validator) {
      return { isValid: true }; // No validator means always valid
    }

    return validator.validate(value);
  }

  validateForm(data: Record<string, any>): ValidationResult {
    const errors: Record<string, string> = {};
    let isValid = true;

    for (const [fieldName, validator] of this.validators) {
      const result = validator.validate(data[fieldName]);
      if (!result.isValid) {
        errors[fieldName] = result.error || 'Invalid value';
        isValid = false;
      }
    }

    return { isValid, errors };
  }
}
```

### 2.4 State Management with Classes

#### **Enhanced Context with Classes**
```typescript
// context/FormStateManager.ts
export class FormStateManager {
  private state: FormState;
  private listeners: Set<(state: FormState) => void> = new Set();

  constructor(initialState: FormState = {}) {
    this.state = initialState;
  }

  // Subscribe to state changes
  subscribe(listener: (state: FormState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Notify all listeners
  private notify(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  // State update methods
  updateField(fieldId: string, value: any): void {
    this.state = {
      ...this.state,
      [fieldId]: value
    };
    this.notify();
  }

  updateMultipleFields(updates: Record<string, any>): void {
    this.state = {
      ...this.state,
      ...updates
    };
    this.notify();
  }

  clearField(fieldId: string): void {
    const newState = { ...this.state };
    delete newState[fieldId];
    this.state = newState;
    this.notify();
  }

  clearAll(): void {
    this.state = {};
    this.notify();
  }

  getState(): FormState {
    return { ...this.state };
  }

  getField(fieldId: string): any {
    return this.state[fieldId];
  }
}

// context/FormDataContext.tsx (Enhanced)
export class FormDataContextClass {
  private parentData: ParentFormData = {};
  private childrenData: ChildrenData = [];
  private listeners: Set<() => void> = new Set();

  // Singleton pattern
  private static instance: FormDataContextClass;
  static getInstance(): FormDataContextClass {
    if (!FormDataContextClass.instance) {
      FormDataContextClass.instance = new FormDataContextClass();
    }
    return FormDataContextClass.instance;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(listener => listener());
  }

  // Enhanced methods with better error handling
  createNewChild(parentId: string, stepId: string): ChildRecord {
    const newChild: ChildRecord = {
      id: uuidv4(),
      parentId,
      stepId: stepId || "defaultStepId",
      data: {},
    };

    this.parentData = {
      ...this.parentData,
      [parentId]: {
        ...this.parentData[parentId],
        childrenData: {
          ...this.parentData[parentId]?.childrenData,
          [stepId]: [
            ...(this.parentData[parentId]?.childrenData?.[stepId] || []),
            newChild
          ]
        }
      }
    };

    this.notify();
    return newChild;
  }

  saveChildData(parentId: string, childId: string, newData: Record<string, any>): void {
    const parentRecord = this.parentData[parentId];
    if (!parentRecord?.childrenData) {
      throw new Error(`Parent ${parentId} not found or has no children data`);
    }

    let childFound = false;
    const updatedChildrenData = { ...parentRecord.childrenData };

    for (const [stepId, children] of Object.entries(updatedChildrenData)) {
      const childIndex = children.findIndex(child => child.id === childId);
      if (childIndex !== -1) {
        updatedChildrenData[stepId] = [
          ...children.slice(0, childIndex),
          { ...children[childIndex], data: { ...children[childIndex].data, ...newData } },
          ...children.slice(childIndex + 1)
        ];
        childFound = true;
        break;
      }
    }

    if (!childFound) {
      throw new Error(`Child ${childId} not found in parent ${parentId}`);
    }

    this.parentData = {
      ...this.parentData,
      [parentId]: {
        ...parentRecord,
        childrenData: updatedChildrenData
      }
    };

    this.notify();
  }

  getState(): { parentData: ParentFormData; childrenData: ChildrenData } {
    return {
      parentData: { ...this.parentData },
      childrenData: [...this.childrenData]
    };
  }
}
```

### 2.5 Utility Classes

#### **Data Processing Classes**
```typescript
// utils/DataProcessor.ts
export abstract class DataProcessor<T, R> {
  abstract process(data: T): R;

  // Chain processors
  pipe<U>(other: DataProcessor<R, U>): DataProcessor<T, U> {
    return new PipelineProcessor(this, other);
  }
}

// utils/QuestionnaireProcessor.ts
export class QuestionnaireProcessor extends DataProcessor<any, Questionnaire> {
  process(data: any): Questionnaire {
    try {
      return Questionnaire.fromJSON(data);
    } catch (error) {
      throw new Error(`Failed to process questionnaire: ${error.message}`);
    }
  }
}

// utils/FormDataProcessor.ts
export class FormDataProcessor extends DataProcessor<Record<string, any>, FormState> {
  private validators: Map<string, Validator<any>> = new Map();

  addValidator(fieldName: string, validator: Validator<any>): FormDataProcessor {
    this.validators.set(fieldName, validator);
    return this;
  }

  process(data: Record<string, any>): FormState {
    const processed: FormState = {};
    const errors: Record<string, string> = {};

    for (const [fieldName, value] of Object.entries(data)) {
      const validator = this.validators.get(fieldName);
      if (validator) {
        const result = validator.validate(value);
        if (result.isValid) {
          processed[fieldName] = value;
        } else {
          errors[fieldName] = result.error || 'Invalid value';
        }
      } else {
        processed[fieldName] = value;
      }
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationError('Form validation failed', errors);
    }

    return processed;
  }
}

// utils/PipelineProcessor.ts
export class PipelineProcessor<T, U, V> extends DataProcessor<T, V> {
  constructor(
    private first: DataProcessor<T, U>,
    private second: DataProcessor<U, V>
  ) {
    super();
  }

  process(data: T): V {
    const intermediate = this.first.process(data);
    return this.second.process(intermediate);
  }
}
```

## 3. Integration with React Components

### 3.1 Using Classes in Components
```typescript
// components/Form/FormWrapper.tsx (Enhanced)
export default function FormWrapper({
  initialAnswers = {},
  ownerComments = {},
  globalOwnerComments,
  onSave,
  onSubmit,
  parsedSteps: providedParsedSteps,
  questionnaireJson,
}: FormWrapperProps) {
  const theme = useTheme();
  
  // Use class-based state management
  const formStateManager = useMemo(() => new FormStateManager(initialAnswers), []);
  const questionnaireProcessor = useMemo(() => new QuestionnaireProcessor(), []);
  const formDataProcessor = useMemo(() => new FormDataProcessor(), []);

  // Process questionnaire data
  const parsedSteps = useMemo(() => {
    if (questionnaireJson) {
      try {
        const questionnaire = questionnaireProcessor.process(questionnaireJson);
        return questionnaire.fields.map(field => field.toJSON());
      } catch (error) {
        console.error("Failed to parse questionnaire:", error);
        return defaultParsedSteps;
      }
    }
    return providedParsedSteps || defaultParsedSteps;
  }, [questionnaireJson, providedParsedSteps, questionnaireProcessor]);

  // Use form state manager
  const [formState, setFormState] = useState(initialAnswers);

  useEffect(() => {
    const unsubscribe = formStateManager.subscribe((newState) => {
      setFormState(newState);
    });
    return unsubscribe;
  }, [formStateManager]);

  // Enhanced save handler with validation
  const handleSave = useCallback(async (data: Record<string, any>) => {
    try {
      const processedData = formDataProcessor.process(data);
      await onSave(processedData);
    } catch (error) {
      if (error instanceof ValidationError) {
        console.error('Validation errors:', error.errors);
        // Handle validation errors in UI
      } else {
        console.error('Save error:', error);
      }
    }
  }, [onSave, formDataProcessor]);

  // Rest of component...
}
```

### 3.2 Custom Hooks with Classes
```typescript
// hooks/useQuestionnaire.ts
export function useQuestionnaire(questionnaireId: string) {
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiService = useMemo(() => new QuestionnaireApiService('/api'), []);
  const storageService = useMemo(() => new LocalStorageService(), []);

  useEffect(() => {
    const loadQuestionnaire = async () => {
      try {
        setLoading(true);
        setError(null);

        // Try to load from cache first
        let cached = storageService.getQuestionnaire(questionnaireId);
        if (cached) {
          setQuestionnaire(cached);
          setLoading(false);
        }

        // Load from API
        const fresh = await apiService.getQuestionnaire(questionnaireId);
        setQuestionnaire(fresh);
        
        // Cache the result
        storageService.saveQuestionnaire(fresh);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load questionnaire');
      } finally {
        setLoading(false);
      }
    };

    loadQuestionnaire();
  }, [questionnaireId, apiService, storageService]);

  const validateField = useCallback((fieldId: string, value: any) => {
    if (!questionnaire) return { isValid: false, error: 'Questionnaire not loaded' };
    return questionnaire.validateField(fieldId, value);
  }, [questionnaire]);

  const getFieldsByLevel = useCallback((level: 'mandatory' | 'recommended' | 'complete') => {
    if (!questionnaire) return [];
    return questionnaire.getFieldsByLevel(level);
  }, [questionnaire]);

  return {
    questionnaire,
    loading,
    error,
    validateField,
    getFieldsByLevel
  };
}
```

## 4. Benefits of OOP Implementation

### 4.1 Code Organization
- **Clear separation of concerns**
- **Reusable components**
- **Easier testing**
- **Better maintainability**

### 4.2 Type Safety
- **Strong typing with TypeScript**
- **Compile-time error checking**
- **Better IDE support**

### 4.3 Extensibility
- **Easy to add new field types**
- **Simple to extend validation rules**
- **Flexible storage options**

### 4.4 Performance
- **Efficient data processing**
- **Reduced re-renders**
- **Better memory management**

## 5. Migration Strategy

### 5.1 Phase 1: Add Classes Alongside Existing Code
1. Create new class-based services
2. Use them in new features
3. Gradually migrate existing code

### 5.2 Phase 2: Refactor Existing Components
1. Replace utility functions with classes
2. Update state management
3. Add validation classes

### 5.3 Phase 3: Full Integration
1. Remove old utility functions
2. Standardize on class-based approach
3. Add comprehensive testing

## 6. Best Practices

### 6.1 Class Design
- **Single Responsibility Principle**: Each class has one job
- **Open/Closed Principle**: Open for extension, closed for modification
- **Dependency Injection**: Pass dependencies through constructors

### 6.2 Error Handling
- **Custom error classes** for different error types
- **Proper error propagation**
- **User-friendly error messages**

### 6.3 Testing
- **Unit tests for each class**
- **Mock dependencies**
- **Test edge cases**

This OOP approach will make your DRT project more maintainable, extensible, and professional while preserving the benefits of React's functional programming model. 