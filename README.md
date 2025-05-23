```mermaid
graph TD;
    User[User] --> |Submits Request| DRT_with_Django;
    DRT_with_Django --> |Reads/Writes Data| PostgreSQL;
    DRT_with_Django --> |Fetches Data from Cache| Cache;
    Cache --> |Regularly Updated from GitHub| GitHub;
    GitHub --Trigger--> Cache;
    Cache --> DRT_with_Django;
    DRT_with_Django --> |Updates/Stores Files| GitHub;

    subgraph "DRT System"
        DRT_with_Django
        Cache
        PostgreSQL
    end

    subgraph "Data Store"
        GitHub
    end
```

---
### **Explanation of the Diagram with Cache**:

1. **User Interaction**:
   - **User** submits a request through the **Django** web service (e.g., filling out a questionnaire).

2. **Cache Layer**:
   - **Django** first queries the **Cache** to serve **recently accessed** or **frequently used data**.
   - This improves performance by reducing the need to fetch data directly from **GitHub** each time.
   
3. **Cache Update from GitHub**:
   - **GitHub** serves as the **central data store** for static files like **questionnaires**, **licenses**, and **metadata**. (You can find an example of the data store here: https://github.com/ClimateSmartAgCollab/DRT-DS-test)
   - **trigger mechanism**: when a file or relevant data in GitHub is modified, GitHub sends an **alert** to DaRT, notifying it to **refresh its cache**. Alternatively, DaRT can periodically check for updates if webhooks aren’t set up in GitHub.

4. **Django to PostgreSQL**:
   - For dynamic data, such as ongoing negotiations, **Django** reads/writes directly to **PostgreSQL**.
   - PostgreSQL handles relational data in the DRT system.

5. **Django to GitHub**:
   - When the output documents (like **licenses** or **completed questionnaires**) are generated, **Django** uploads these to **GitHub** for persistent storage.
   
6. **Django Reads from GitHub and Cache**:
   - When data is requested , **Django** first checks the **Cache**. If the cache is stale or doesn’t contain the needed data, it fetches the **latest version from GitHub** and updates the cache.
   - This caching system ensures that GitHub is the **source of truth** but minimizes direct requests to GitHub, improving efficiency.

---

### **Entire Workflow of DaRT System with Caching**

1. **User Submits Request**:
   - The requestor accesses DaRT via a **UUID-based link** and submits a **data request** using a questionnaire.
   - **Django** handles the user interaction, pulling necessary data from the **Cache** if it is available, or directly from **GitHub** if necessary.

2. **Cache and GitHub Interaction**:
   - **Cache Layer**: DaRT has a local cache where **recent data** is stored for quicker access.
   - **Trigger from GitHub**: Whenever a change happens in GitHub, a **trigger** or webhook sends an alert to DaRT, prompting it to **refresh its cache**. (If triggers aren’t set up, DaRT regularly **polls GitHub** for changes.)

3. **Data Fetching from GitHub**:
   - When new data is needed, Django checks the cache first. If data is not in the cache or is outdated, Django fetches it from GitHub and updates the cache.
   - This ensures DaRT always has the latest data while avoiding unnecessary traffic to GitHub.

4. **Handling Negotiations**:
   - **Django** manages **negotiation data** (requestor-owner interactions) by reading/writing negotiation states to **PostgreSQL**.
   - Each negotiation is tracked in **PostgreSQL**, and related documents (like licenses or query outputs) are stored back into **GitHub** after approval.

5. **Updating GitHub**:
   - Once a negotiation is completed or a license is generated, **Django** saves the final documents (Archive) into **GitHub** for record-keeping.
   
6. **Serving Data Efficiently**:
   - As DaRT continues to serve requestors and owners, it uses the cache to minimize frequent pulls from GitHub while ensuring that cached data is always up-to-date when changes are made in the GitHub repository.

---

# DRT Data Structure

The following tables are the Data Structure of the DRT system.

## Data Structure Tables

### Requestor Table
![Flowchart](https://github.com/setayesh78/DRT_Design_Document/blob/main/tables%20images/requestor_OTP.png)

### NLink Table
![Diagram](https://github.com/setayesh78/DRT_Design_Document/blob/main/tables%20images/NLink.png)

### Negotiation Table
![Screenshot](https://github.com/setayesh78/DRT_Design_Document/blob/main/tables%20images/Negotiation.png)

### Archive Table
![Screenshot](https://github.com/setayesh78/DRT_Design_Document/blob/main/tables%20images/Archive.png)

### Summary Statistics Table
![Screenshot](https://github.com/setayesh78/DRT_Design_Document/blob/main/tables%20images/summaryStat.png)
