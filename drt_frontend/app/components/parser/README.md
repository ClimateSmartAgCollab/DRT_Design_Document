# OCA Parser Module

A clean, modular TypeScript parser for OCA metadata that transforms JSON into structured, render-ready form steps.
Built with a **Layered Architecture** pattern following Clean Architecture principles.

---

## Layer Responsibilities

### **Facade Layer**
- **FormStructureParser**: Single entry point orchestrating the entire parsing workflow
- Public API for external consumers
- Coordinates all parsing operations

### **Domain Services Layer**
- **PresentationsExtractor**: Parses ADC (old/new) layouts and extracts presentation data
- **PresentationParser**: Converts pages/sections from a single AdcForm
- **OverlayExtractor**: Gathers labels, options, types, and metadata
- **RelationshipGraphBuilder**: Builds capture_base → children relationship graph

### **Construction Layer**
- **FieldFactory**: Creates Field objects from OverlaySnapshot data
- **FieldValidator**: Validates field integrity and references
- **FieldDefaults**: Provides default field configurations

### **Value Objects Layer**
- **OverlaySnapshot**: Immutable overlay DTO with helper methods (labelsFor, getFieldType, etc.)
- **LanguageMap**: Language-keyed lookups via Lang utility

### **Infrastructure / Ports Layer**
- **EntityLocator**: Pluggable lookup strategy for entities
- **DefaultEntityLocator**: Concrete implementation

### **Compatibility Layer**
- **Legacy functions**: parseJsonToFormStructure and other procedural wrappers
- Backward compatibility for existing code
- Delegates to new layered architecture

---

## 🎯 Design Patterns Used

- **Layered Architecture**: Clear separation of concerns with dependency direction
- **Facade Pattern**: Single entry point hiding complexity
- **Factory Pattern**: FieldFactory for object creation
- **Builder Pattern**: RelationshipGraphBuilder for complex object construction
- **Strategy Pattern**: Pluggable EntityLocator implementations
- **Snapshot Pattern**: Immutable OverlaySnapshot data
- **Pipeline Pattern**: Sequential data transformation
- **Dependency Injection**: Constructor-based dependency management

---