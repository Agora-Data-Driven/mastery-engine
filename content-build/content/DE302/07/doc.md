Security and governance are architectural properties, not a checklist added after a pipeline works. A data platform must control who can act, how stored data is encrypted, where sensitive fields appear, where resources live, and how administrative boundaries are organized. This lesson turns those concerns into design decisions that can be explained, tested, and operated.

## IAM: Roles, Service Accounts, and Organization Policies

Google Cloud Identity and Access Management evaluates what a principal may do on a resource. A role is a named collection of permissions. An allow policy binds a principal to a role at a resource such as an organization, folder, project, dataset, bucket, or service account. Because many grants are inherited by descendants, the attachment point is as important as the role itself.

Basic roles such as Owner and Editor are broad and are poor defaults for production. Predefined roles usually provide service-specific permission sets, while custom roles can fill a genuine gap. Apply least privilege by identifying the exact operations, selecting the narrowest appropriate role, and attaching it at the smallest practical resource scope. Validate with real workflow tests because a role that looks sufficient by name may omit a required permission.

Service accounts are non-human identities for workloads, but they are also resources that other principals can use or administer. These two views must not be confused. Granting a service account Storage Object Viewer lets the workload read objects. Granting a user Service Account User or Token Creator on that identity can let the user attach or impersonate it, thereby exercising the service account's effective privileges. Impersonation permission is therefore an access path to every resource the identity can reach.

Prefer a dedicated service account per workload or trust boundary. A Dataflow job that reads one bucket and writes one dataset should not share an organization-wide identity with an unrelated deployment system. Avoid downloadable service account keys where workload identity or short-lived impersonation is available. Keys are long-lived secrets that can escape the platform's context and become difficult to inventory.

Organization Policy provides guardrails over resource configuration. Constraints can restrict resource locations, domain membership, external IP use, key creation, or other supported behaviors. Policies inherit through the resource hierarchy and can prevent a project administrator from creating a configuration the organization has prohibited. IAM answers whether a principal is authorized to request an action; Organization Policy can still reject an authorized action because the resulting configuration violates a guardrail.

Deny policies add explicit permission denials, and IAM Conditions can make grants depend on attributes such as time or resource name. Use these mechanisms purposefully. A complicated condition nobody can explain may be less safe than a narrower resource-level binding. Keep policy as code, review changes, use Policy Troubleshooter and audit logs, and test negative cases as well as successful access.

## Encryption and Key Management: Google-Managed vs CMEK

Google Cloud encrypts customer data at rest by default with Google-owned and Google-managed keys. This requires no customer configuration, and key lifecycle tasks such as rotation are handled by Google for supported services. Default encryption is a strong baseline and is appropriate when an organization does not need direct control over the key-encryption-key lifecycle.

Customer-managed encryption keys, or CMEK, are Cloud KMS keys used by compatible services to protect their data encryption keys through envelope encryption. The service encrypts data with a data encryption key, then wraps that key with the customer-controlled key-encryption key. Administrators control KMS key location, protection level, IAM, rotation schedule, disabling, and destruction within supported service behavior.

CMEK is chosen for control and compliance, not because default encryption means unencrypted data. It can establish a customer-specific cryptographic boundary, provide key usage auditability, support separation of duties, and allow access to be disabled centrally. Some requirements mandate keys in a particular project or hardware protection level. Record the requirement that justifies CMEK because it introduces an operational dependency.

Key hierarchy matters. A key ring is a regional container, a crypto key expresses purpose and policy, and key versions hold cryptographic material. Rotation generally creates a new primary version for new encryption; old versions remain necessary to decrypt data protected earlier. Destroying or disabling a required version can make data unavailable. Crypto-shredding is powerful precisely because recovery may be impossible, so destructive lifecycle operations require strict approvals and rehearsed recovery expectations.

Use a dedicated key-management project when separation of duties and centralized controls justify it. Grant the service's encryption identity the required encrypt and decrypt permissions on the key, while limiting who can administer keys or change IAM. Keep key location compatible with protected resources. Monitor KMS errors and usage logs, and consider service behavior during temporary KMS unavailability.

Cloud KMS Autokey can simplify compliant CMEK provisioning for supported resources. Cloud HSM supplies hardware-backed protection, while Cloud EKM links compatible external key systems. These options add cost and failure modes and should follow explicit requirements. The best key architecture is the least complex one that meets the organization's real control objectives.

## Cloud DLP: PII Detection and Masking

Cloud Data Loss Prevention capabilities are now documented under Sensitive Data Protection, while the DLP API name remains common. The service can inspect text and supported repositories for sensitive values. Detectors are called infoTypes and cover patterns such as email addresses, phone numbers, credentials, government identifiers, or organization-specific values.

An inspection configuration specifies which infoTypes to seek, likelihood thresholds, limits, and optional custom detectors. Built-in detectors accelerate common cases, but context affects precision. A digit pattern may resemble an identifier without being one. Custom dictionaries and regex-based detectors can represent domain vocabulary. Tune configuration on representative data and review false positives and false negatives with data owners.

Inspection findings are themselves sensitive. A finding may include location, type, likelihood, and sometimes contextual material. Restrict who can access findings, avoid logging raw samples casually, and choose output destinations deliberately. Discovery scans help locate risk but do not automatically remediate it or prove that every sensitive value was found.

De-identification transforms detected content. Redaction removes values; replacement substitutes a label; masking hides some or all characters; bucketing reduces precision; date shifting changes dates while retaining useful relationships; and tokenization substitutes controlled values. The correct transform depends on the analytical purpose. Showing the last four characters may support customer service but remain unsuitable for public data.

Reversible tokenization supports controlled re-identification and therefore requires careful key management and authorization. Irreversible transformation reduces re-identification capability but may also destroy analytical utility. Deterministic transforms can preserve equality for joins, yet repeated tokens may reveal frequency patterns. Evaluate privacy risk across the resulting dataset rather than assuming a masked column is automatically anonymous.

Place Sensitive Data Protection in a broader control loop: discover, classify, transform or restrict, verify, and monitor. A batch process can scan a landing area, quarantine unexpected sensitive content, de-identify approved fields, and publish a curated dataset. Schema-level policy tags and IAM then control access to retained sensitive columns. Repeat scans because new sources and schema drift can reintroduce PII.

## Data Residency and Sovereignty

Data residency specifies where data is stored or processed according to a defined geographic boundary. Data sovereignty is broader: it concerns which laws, authorities, operational controls, and organizational obligations govern the data. Selecting a region is essential but does not alone satisfy a sovereignty program.

Start with a data classification and a documented location requirement. Choose supported resource locations for storage, processing, logs, backups, metadata, and encryption keys. Colocate services where practical to reduce transfer latency, network charges, and accidental cross-boundary movement. Multi-region labels represent defined geographic scopes and must be checked against the exact policy rather than assumed compliant.

Trace the complete data path. Ingestion may originate outside the allowed boundary, a pipeline may stage temporary files elsewhere, an orchestrator may send payloads to an external API, or a disaster-recovery copy may cross regions. Support tooling, monitoring exports, and human access can also matter. A residency diagram should include primary data, derived data, caches, backups, logs, metadata, keys, and administrative access.

Organization Policy location constraints can prevent creation of unsupported resources, but they do not retroactively move existing data or validate every external destination. Service-specific controls, VPC Service Controls, IAM, network design, contractual measures, and audit evidence may all contribute. Validate each product's location semantics because control planes and data planes can have different documented behavior.

Requirements change. Maintain a resource inventory, continuously detect drift, review new service dependencies, and rehearse incidents that require restoration within approved locations. Legal and compliance owners must interpret obligations; architects translate those obligations into enforceable controls and evidence. Avoid absolute claims such as no data ever leaves a country unless the entire system and its operational processes can prove them.

## Project and Dataset Architecture for Governance

Google Cloud's resource hierarchy is organization, folders, projects, and service resources. Projects are boundaries for APIs, quotas, billing association, many IAM grants, and resource lifecycle. Folders group projects so policies can inherit by environment, business unit, or control regime. A sound hierarchy makes the common secure path easy without forcing every team into one enormous project.

Separate production from development to reduce blast radius and make policy differences explicit. Shared services such as networking, security logging, and key management may live in centrally controlled projects. Data domains can own projects for ingestion, processing, and publication when that ownership model improves accountability. There is no universal project count; choose boundaries from trust, lifecycle, quota, cost attribution, and operational ownership.

BigQuery datasets provide a more granular boundary for location, access, table defaults, and ownership. Separate raw, curated, and published datasets when they have different consumers and controls. A sensitive source dataset can grant a pipeline identity read access while analysts receive access only to de-identified curated outputs. Authorized views, row policies, column policy tags, and sharing mechanisms refine access without putting every table in a separate project.

Avoid granting broad project roles merely to solve one dataset need. Use groups for human access and service accounts for workloads, bind roles at datasets or tables when practical, and manage changes through reviewed infrastructure. Establish naming, labels, owners, retention defaults, and deletion procedures. Labels improve cost and inventory reporting but are not security boundaries.

Governance also requires controlled data movement between projects. Identify producer and consumer identities, grant only required access, configure service perimeters where appropriate, and log administrative and data-access events according to risk. For cross-project CMEK, sharing, or pipeline execution, document both the resource identity and the service agent that needs permission.

A useful architecture can answer five questions quickly: who owns this data, which identity writes it, which consumers can read it, which policies and keys protect it, and how it is retired. If those answers require inspecting hundreds of ad hoc grants, the hierarchy is not doing enough work. Periodic access reviews, policy tests, cost reports, and disaster-recovery exercises turn the static structure into an operating governance system.
