# DRT_Design_Document:

### **Explanation of the Diagram**:

1. **User Interaction**:
   - **User** submits a **request** through Django.
   
2. **Django as Backend**:
   - **Django** fetches questionnaire templates or license files from **GitHub**, which acts as a **data store** for rarely changed textual data (questionnaires, licenses, etc.).
   - Django also handles **reading and writing data** to/from **PostgreSQL**, which stores the **negotiation data**, **requestor and owner information**, and other relational data.

3. **Data Stores**:
   - **GitHub** is used to store static or rarely changed data like **questionnaires** and **metadata** (e.g., licenses). Django updates or fetches these files when necessary.
   - **Google Docs** is also involved, where **metadata** (like owner info) is stored, or users can upload files (e.g., questionnaire responses or documents).
   - **PostgreSQL** acts as the main data store for dynamic data, such as **negotiations**, **request status**, and other relational data linked to the DaRT system.

---

### **Details of Each Interaction**:

- **User to Django**: Users interact with the Django application to submit requests, view or complete questionnaires, and handle negotiations.
  
- **Django to GitHub**: Django fetches **questionnaire schemas** or **license templates** from GitHub. This is used when a user fills out a questionnaire, and the system requires static content.

- **Django to PostgreSQL**: Django reads and writes relational data (e.g., negotiation states, requestors, and owners) to PostgreSQL.

- **Django to Google Docs**: If using Google Docs for metadata or file storage (e.g., linking owner info to requestor emails or uploading documents), Django interacts with Google Docs to store and retrieve this data.

- **Updates**: Django stores generated documents (e.g., licenses, completed questionnaires) back into **GitHub** and **Google Docs** for record-keeping.

---

This diagram represents a **modular system** where **GitHub** stores static, rarely changed data, and **PostgreSQL** manages dynamic relational data in the DaRT system. Django acts as the core processing unit, fetching data from these stores and interacting with users.

---

```mermaid
graph TD;
    User[User] --> |Submits Request| Django;
    Django --> |Fetches Questionnaires| GitHub;
    Django --> |Reads Data| PostgreSQL;
    Django --> |Sends Data to| PostgreSQL;
    Django --> |Updates/Stores Files| GitHub;
    Django --> |Stores Metadata| GitHub;

    subgraph "DRT System"
        Django
        PostgreSQL
    end

    subgraph "DRT Data Store"
        GitHub
    end
