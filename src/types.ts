export type AuthType = 'password' | 'private_key';
export type OsType = 'Linux' | 'Windows' | 'AIX' | 'Solaris';
export type ShellType = 'bash' | 'powershell' | 'cmd';

export interface SSHNode {
  id: string;
  name: string;
  hostname: string;
  ipAddress: string;
  sshPort: number;
  authType: AuthType;
  password?: string;
  privateKey?: string;
  oracleHome?: string;
  gridHome?: string;
  oracleSid?: string;
  asmSid?: string;
  oracleUser?: string;
  gridUser?: string;
  rootUser: string;
  isDemo?: boolean;
  nodeType?: 'RAC' | 'SINGLE';
  dbVersion?: string;
  osVersion?: string;
  osType?: OsType;
  shellType?: ShellType;
  powershellPort?: number;
  macAddress?: string;
  powerState?: 'ON' | 'OFF';
  isPowerOff?: boolean;
  status?: 'ONLINE' | 'OFFLINE';
}

export interface MetricPoint {
  time: string;
  cpu: number;
  memory: number;
  iops: number;
  redo: number;
  sessions: number;
  transactions: number;
}

export interface DiskGroup {
  name: string;
  state: 'MOUNTED' | 'DISMOUNTED';
  totalSizeGB: number;
  freeSpaceGB: number;
  usedSpaceGB: number;
  usagePercentage: number;
  compatibleASM: string;
  compatibleRDBMS: string;
  disks: {
    name: string;
    path: string;
    status: 'ONLINE' | 'OFFLINE';
    sizeGB: number;
    failureGroup: string;
  }[];
}

export interface PDBInfo {
  pdbName: string;
  conId: number;
  openMode: 'READ WRITE' | 'READ ONLY' | 'MOUNTED' | 'CLOSED';
  status: 'NORMAL' | 'NEW' | 'RECOVERY';
  restricted: 'YES' | 'NO';
  saveState: 'YES' | 'NO';
  defaultService: string;
}

export interface TablespaceInfo {
  name: string;
  status: 'ONLINE' | 'OFFLINE' | 'READ ONLY';
  usedPercent: number;
  freePercent: number;
  autoextend: 'YES' | 'NO';
  maxSizeGB: number;
  usedGB: number;
  totalGB: number;
}

export interface SessionInfo {
  sid: number;
  serial: number;
  username: string;
  status: 'ACTIVE' | 'INACTIVE' | 'KILLED';
  osUser: string;
  machine: string;
  program: string;
  type: 'USER' | 'BACKGROUND';
  blockingSession?: number;
  waitEvent?: string;
  sqlText?: string;
  secondsInWait: number;
}

export interface SchedulerJobInfo {
  owner: string;
  jobName: string;
  status: 'RUNNING' | 'FAILED' | 'BROKEN' | 'SCHEDULED' | 'DISABLED';
  lastStartDate?: string;
  nextRunDate?: string;
  runCount: number;
  failureCount: number;
}

export interface AlertLogEntry {
  timestamp: string;
  level: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  message: string;
}

export interface ArchivedLogInfo {
  sequence: number;
  firstTime?: string;
  nextTime?: string;
  applied: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  nodeName: string;
  user: string;
  action: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  details?: string;
  clientIp?: string;
  macAddress?: string;
  hostPcName?: string;
  targetCategory?: 'DATABASE' | 'OS' | 'PACS' | 'WEBLOGIC' | 'USER_SESSION' | 'SECURITY' | 'SYSTEM';
  severity?: 'INFO' | 'WARNING' | 'CRITICAL';
  loginTime?: string;
  logoutTime?: string;
  sessionDuration?: string;
}

export interface NodeTelemetry {
  nodeId: string;
  online: boolean;
  os: {
    hostname: string;
    osVersion: string;
    kernelVersion: string;
    uptime: string;
    cpuUsage: number;
    memoryUsage: number;
    memoryTotalGB: number;
    memoryUsedGB: number;
    swapUsage: number;
    swapTotalGB: number;
    swapUsedGB: number;
    diskUsage: number;
    diskTotalGB: number;
    diskUsedGB: number;
    loadAverage: [number, number, number];
    runningProcessesCount: number;
    topMemoryProcesses: { pid: number; name: string; memPercent: number; cpuPercent: number }[];
    topCpuProcesses: { pid: number; name: string; memPercent: number; cpuPercent: number }[];
    networkUsageRxKBps: number;
    networkUsageTxKBps: number;
    filesystemUsage: { mount: string; sizeGB: number; usedGB: number; percent: number }[];
    temperatureCelsius?: number;
  };
  database: {
    dbName: string;
    instanceName: string;
    instanceStatus: 'OPEN' | 'MOUNTED' | 'STARTED' | 'SHUTDOWN' | 'UNKNOWN';
    openMode: 'READ WRITE' | 'READ ONLY' | 'MOUNTED' | 'CLOSED';
    databaseRole: 'PRIMARY' | 'PHYSICAL STANDBY' | 'LOGICAL STANDBY';
    version: string;
    startupTime: string;
    archiveMode: 'ARCHIVELOG' | 'NOARCHIVELOG';
    flashbackStatus: 'ON' | 'OFF';
    forceLogging: 'YES' | 'NO';
    protectionMode: 'MAXIMUM PERFORMANCE' | 'MAXIMUM AVAILABILITY' | 'MAXIMUM PROTECTION';
    logMode: string;
    characterSet: string;
    nationalCharacterSet: string;
    controlFile: string;
    spFile: string;
    listenerStatus: 'RUNNING' | 'STOPPED' | 'UNKNOWN';
    services: string[];
  };
  rac: {
    clusterName: string;
    nodeList: string[];
    vipStatus: { node: string; ip: string; status: 'ONLINE' | 'OFFLINE' }[];
    scanListener: 'ONLINE' | 'OFFLINE' | 'PARTIAL';
    localListener: 'ONLINE' | 'OFFLINE';
    interconnectStatus: 'ACTIVE' | 'DEGRADED' | 'DOWN';
    crsStatus: 'ONLINE' | 'OFFLINE' | 'INTERMEDIATE';
    cssStatus: 'ONLINE' | 'OFFLINE';
    evmStatus: 'ONLINE' | 'OFFLINE';
    ohasStatus: 'ONLINE' | 'OFFLINE';
    nodeApplications: { name: string; status: 'ONLINE' | 'OFFLINE' }[];
    servicesRunning: { name: string; preferredNode: string; status: 'ONLINE' | 'OFFLINE' }[];
    resourceStatus: { resource: string; type: string; status: 'ONLINE' | 'OFFLINE' | 'PARTIAL' }[];
  };
  asm: {
    instanceStatus: 'OPEN' | 'MOUNTED' | 'STARTED' | 'SHUTDOWN' | 'UNKNOWN';
    version: string;
    compatibility: string;
    diskDiscoveryString: string;
    diskgroups: DiskGroup[];
    allocationUnitMB: number;
  };
  pdb: PDBInfo[];
  memory: {
    sgaTargetMB: number;
    sgaMaxMB: number;
    pgaTargetMB: number;
    pgaAllocatedMB: number;
    sharedPoolMB: number;
    bufferCacheMB: number;
    largePoolMB: number;
    javaPoolMB: number;
    streamsPoolMB: number;
  };
  tablespaces: TablespaceInfo[];
  sessions: SessionInfo[];
  alertLog: AlertLogEntry[];
  rman: {
    lastBackupDate: string;
    backupStatus: 'COMPLETED' | 'FAILED' | 'RUNNING' | 'NONE';
    archiveBackupStatus: string;
    recoveryWindowDays: number;
    backupSizeGB: number;
  };
  dataGuard?: {
    primaryDb: string;
    standbyDb: string;
    lagSeconds: number;
    transportStatus: 'TRANSPORTING' | 'STALLED' | 'UNKNOWN';
    applyStatus: 'APPLYING' | 'WAITING_FOR_LOG' | 'OFF';
  };
  schedulerJobs: SchedulerJobInfo[];
  performanceHistory: MetricPoint[];
  archivedLogs?: ArchivedLogInfo[];
}

export interface ClusterSummary {
  totalNodes: number;
  runningNodes: number;
  downNodes: number;
  asmRunning: number;
  asmDown: number;
  databaseRunning: number;
  databaseDown: number;
  cpuUsageAverage: number;
  memoryUsageAverage: number;
  diskUsageAverage: number;
  clusterHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  racStatus: 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'NO NODES' | '0';
  crsStatus: 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'NO NODES' | '0';
  ocrStatus: 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'NO NODES' | '0';
  votingDiskStatus: 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'NO NODES' | '0';
}

export interface PrimaryDatabase {
  id: string;
  name: string;
  nodeId: string;
  nodeIds?: string[];
  uniqueName: string;
  oracleSid: string;
  dbType?: 'RAC' | 'SINGLE_INSTANCE' | 'WINDOWS_RAC' | 'WINDOWS_SINGLE' | string;
  clusterName?: string;
  scanName?: string;
  scanPort?: number;
  oracleHome?: string;
  gridHome?: string;
  asmSid?: string;
  osType?: OsType;
  instances?: {
    nodeId: string;
    nodeName?: string;
    instanceName: string;
    instanceNumber?: number;
    oracleSid: string;
    asmSid?: string;
    status: 'OPEN' | 'MOUNTED' | 'SHUTDOWN';
  }[];
  status: 'OPEN' | 'MOUNTED' | 'SHUTDOWN';
  openMode: 'READ WRITE' | 'READ ONLY' | 'MOUNTED' | 'CLOSED';
  archiveMode: 'ARCHIVELOG' | 'NOARCHIVELOG';
  version: string;
  redoLogSizeMB: number;
  oracleBase?: string;
  tnsAdmin?: string;
  datafilePath?: string;
  fraPath?: string;
  archiveLogDest?: string;
  redoLogPath?: string;
  dgBrokerConfigPath?: string;
  auditFileDest?: string;
  passwordFilePath?: string;
  latestSequence?: number;
  archivedLogs?: ArchivedLogInfo[];
}

export interface StandbyDatabase {
  id: string;
  name: string;
  primaryDbId: string;
  nodeId: string;
  uniqueName: string;
  dbUniqueName?: string;
  oracleSid?: string;
  role?: string;
  status: 'OPEN' | 'MOUNTED' | 'SHUTDOWN';
  openMode: 'READ ONLY' | 'READ ONLY WITH APPLY' | 'MOUNTED' | 'CLOSED';
  standbyType?: 'PHYSICAL STANDBY' | 'LOGICAL STANDBY' | 'SNAPSHOT STANDBY';
  transportMode?: 'ASYNC' | 'SYNC';
  syncStatus: 'SYNCHRONIZED' | 'SYNCING' | 'LAG_DETECTED' | 'STALLED';
  redoApplied: boolean;
  lagSeconds: number;
  transportStatus: 'TRANSPORTING' | 'STALLED' | 'UNKNOWN';
  applyRateMBS: number;
  latestSequence?: number;
  appliedSequence?: number;
  oracleHome?: string;
  gridHome?: string;
  oracleBase?: string;
  tnsAdmin?: string;
  datafilePath?: string;
  fraPath?: string;
  archiveLogDest?: string;
  redoLogPath?: string;
  dgBrokerConfigPath?: string;
  auditFileDest?: string;
  passwordFilePath?: string;
  archivedLogs?: ArchivedLogInfo[];
  farSyncId?: string; // Optional Far Sync instance routing through
}

// Oracle Data Guard Far Sync Instance (Zero Data Loss Redo Transport Repeater)
export interface FarSyncInstance {
  id: string;
  name: string; // e.g. "FAR_SYNC_DHK_01" or "FS_REPEATER_PRIMARY"
  primaryDbId: string;
  nodeId?: string;
  hostIp: string;
  port: number;
  oracleSid: string;
  dbUniqueName: string;
  protectionMode: 'MAXIMUM AVAILABILITY' | 'MAXIMUM PROTECTION' | 'MAXIMUM PERFORMANCE';
  transportMode: 'SYNC_TO_ASYNC' | 'SYNC' | 'ASYNC';
  compression: 'ENABLED' | 'DISABLED';
  compressionAlgorithm?: 'ZLIB' | 'HIGH' | 'LOW' | 'BASIC';
  status: 'ACTIVE_FORWARDING' | 'IDLE' | 'STALLED' | 'STANDBY_ATTACHED' | 'DISCONNECTED';
  targetStandbyIds: string[]; // List of standby IDs receiving forwarded redo
  rttLatencyMs: number;
  ingestRateMBps: number;
  forwardingRateMBps: number;
  redoBufferUsagePct: number;
  lastSequenceReceived?: number;
  lastSequenceForwarded?: number;
  zeroDataLossVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserPermissions {
  canViewDashboard: boolean;
  canViewNodes: boolean;
  canExecuteNodeActions: boolean; // restart CRS, sync, clear logs
  canAddEditNodes: boolean; // add, edit, delete nodes
  canManagePrimaryDb: boolean; // add, delete primary dbs, backup, archivelog
  canManageStandbyDb: boolean; // power on, switchover, failover, mount/read-only mode
  canManageUsers: boolean; // create users, lock, expire, delete
  canAdd?: boolean; // permission to create new records
  canEdit?: boolean; // permission to edit records
  canDelete?: boolean; // permission to delete records
}

export type UserRole = 'ADMIN' | 'POWER_USER' | 'OPERATOR' | 'VIEWER' | 'CUSTOM';

export interface UserAccount {
  id: string;
  username: string;
  email: string;
  phone: string;
  passwordHash: string; // Plaintext for demo visibility as requested
  role: UserRole;
  allowedModules?: string[]; // Module keys allowed in side menu, e.g. ['dashboard', 'nodes', ...]
  permissions?: UserPermissions;
  isLocked: boolean;
  isExpired: boolean;
  expiresAt?: string; // e.g. YYYY-MM-DD
  createdAt: string;
  lastLogin?: string;
  lastUpdated: string;
  avatarUrl?: string;
}

export interface PortalBranding {
  logoUrl?: string;
  portalName: string;
  portalSubtitle: string;
  avatarUrl?: string;
}

export interface EmergencyDispatchLog {
  id: string;
  type: 'EMAIL' | 'SMS' | 'BOTH';
  recipientEmail: string;
  recipientPhone: string;
  eventType?: 'POWER_CUT' | 'DATA_GUARD_OUTAGE' | 'TEST_ALERT';
  subject: string;
  body: string;
  status: 'DISPATCHED' | 'SENT' | 'DELIVERED' | 'FAILED';
  timestamp: string;
}

export interface CustomNotification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
}

export interface RmanBackupRecord {
  id: string;
  dbId?: string;
  dbName?: string;
  dbUniqueName?: string;
  dbType?: 'PRIMARY' | 'STANDBY' | 'RAC' | 'SINGLE';
  backupType: 'FULL_LEVEL0' | 'INCREMENTAL_LEVEL1' | 'ARCHIVELOG' | 'CONTROLFILE_SPFILE';
  status: 'COMPLETED' | 'FAILED' | 'IN_PROGRESS';
  sizeGB: number;
  durationSeconds?: number;
  commandExecuted?: string;
  logs?: string[];
  timestamp?: string;
  startTime?: string;
  endTime?: string;
  command?: string;
}

export interface DataPumpJobRecord {
  id: string;
  dbId?: string;
  dbName?: string;
  dbUniqueName?: string;
  dbType?: 'PRIMARY' | 'STANDBY' | 'RAC' | 'SINGLE';
  operation: 'EXPORT' | 'IMPORT';
  mode: 'FULL' | 'SCHEMA' | 'TABLE' | 'TABLESPACE';
  sourceVersion: string;
  targetVersion: string;
  objectNames?: string;
  directory?: string;
  status: 'COMPLETED' | 'FAILED' | 'RUNNING';
  dumpFileName: string;
  dumpFileSizeMB: number;
  commandExecuted?: string;
  logs?: string[];
  timestamp?: string;
  startTime?: string;
  endTime?: string;
  command?: string;
}

// ==========================================
// INFRASTRUCTURE COMMAND CENTER INTERFACES
// ==========================================

export type OperationalCenterType = 'NOC' | 'SOC' | 'CDTIC' | 'ASSET' | 'VAULT';

export interface InfrastructureEvidence {
  logLine?: string;
  metricSpike?: string;
  packetTrace?: string;
  payloadSample?: string;
  processHash?: string;
  networkFlow?: string;
  timestamp: string;
}

export interface RollbackStep {
  stepNumber: number;
  description: string;
  command: string;
  executedAt?: string;
  status?: 'PENDING' | 'SUCCESS' | 'FAILED';
}

export interface SafeAutomatedResponse {
  id: string;
  label: string;
  description: string;
  command: string;
  status: 'AVAILABLE' | 'EXECUTING' | 'SUCCESS' | 'FAILED' | 'ROLLED_BACK';
  rollbackCommand: string;
  requiresConfirmation: boolean;
  autoRemediationAllowed: boolean;
  executedAt?: string;
  executedBy?: string;
}

export interface IncidentAuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
  verificationHash: string;
}

export interface InfrastructureIssue {
  id: string;
  title: string;
  center: 'NOC' | 'SOC' | 'CDTIC';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  confidenceScore: number; // 0 to 100
  evidence: InfrastructureEvidence;
  timeline: { timestamp: string; phase: string; description: string }[];
  businessImpact: string;
  rootCause: string;
  affectedAssets: string[];
  recommendedActions: string[];
  safeAutomatedResponse: SafeAutomatedResponse;
  rollbackPlan: RollbackStep[];
  auditTrail: IncidentAuditEntry[];
  status: 'OPEN' | 'INVESTIGATING' | 'REMEDIATED' | 'MUTED';
  createdAt: string;
  updatedAt: string;
}

// NOC Telemetry & Metrics
export interface NetworkDevice {
  id: string;
  name: string;
  deviceType: 'CORE_SWITCH' | 'DISTRIBUTION_SWITCH' | 'EDGE_ROUTER' | 'FIREWALL' | 'LOAD_BALANCER';
  ipAddress: string;
  macAddress: string;
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  uptime: string;
  cpuUsage: number;
  memoryUsage: number;
  bandwidthMbpsRx: number;
  bandwidthMbpsTx: number;
  latencyMs: number;
  packetLossPercent: number;
  activePortCount: number;
  bgpStatus: 'ESTABLISHED' | 'ACTIVE' | 'IDLE' | 'DOWN';
  ospfStatus: 'FULL' | '2WAY' | 'DOWN';
  firmwareVersion: string;
}

export interface NetworkLatencyLink {
  sourceNode: string;
  targetNode: string;
  latencyMs: number;
  jitterMs: number;
  status: 'HEALTHY' | 'HIGH_LATENCY' | 'PACKET_DROPS' | 'LINK_DOWN';
}

export interface NocTelemetryData {
  devices: NetworkDevice[];
  latencyLinks: NetworkLatencyLink[];
  totalBandwidthGbps: number;
  avgNetworkLatencyMs: number;
  overallPacketLossPercent: number;
  activeBgpNeighbors: number;
  totalVlansConfigured: number;
}

// SOC Telemetry & SIEM Events
export interface SiemEvent {
  id: string;
  timestamp: string;
  sourceIp: string;
  destinationIp: string;
  protocol: 'SSH' | 'HTTPS' | 'TCP' | 'UDP' | 'ICMP' | 'SQL';
  eventType: 'FAILED_AUTH' | 'PORT_SCAN' | 'BRUTE_FORCE' | 'MALICIOUS_PAYLOAD' | 'PRIVILEGE_ESCALATION' | 'UNAUTHORIZED_ACCESS';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  ruleTriggered: string;
  actionTaken: 'BLOCKED' | 'FLAGGED' | 'LOGGED' | 'QUARANTINED';
  userAccount?: string;
  rawLog: string;
}

export interface FirewallRule {
  id: string;
  ruleName: string;
  action: 'ALLOW' | 'DENY' | 'REJECT';
  sourceSubnet: string;
  destinationSubnet: string;
  portRange: string;
  hitsCount: number;
  status: 'ACTIVE' | 'DISABLED';
}

export interface SocTelemetryData {
  siemEvents: SiemEvent[];
  firewallRules: FirewallRule[];
  blockedIpList: string[];
  activeThreatCount: number;
  securityComplianceScore: number; // e.g. 94%
  iamAnomaliesCount: number;
  openVulnerabilitiesCount: number;
}

// CDTIC Threat Intelligence Data
export interface ThreatIntelligenceFeed {
  id: string;
  cveId: string;
  title: string;
  cvssScore: number;
  mitreTactics: string[]; // e.g. ["TA0001 Initial Access", "TA0003 Persistence"]
  mitreTechniques: string[]; // e.g. ["T1190 Exploit Public-Facing Application"]
  affectedSystems: string[];
  description: string;
  threatActorGroup?: string; // e.g. "APT29", "FIN7", "Lazarus"
  iocSignatures: string[]; // IP hashes, file hashes, domains
  mitigationAvailable: boolean;
  publishedDate: string;
}

export interface ActiveDecoyTrap {
  id: string;
  trapName: string;
  trapType: 'SSH_HONEYPOT' | 'ORACLE_DB_DECOY' | 'RDP_CANARY' | 'CREDENTIAL_BAIT';
  listenIp: string;
  listenPort: number;
  triggersCount: number;
  lastAttackerIp?: string;
  lastTriggerTime?: string;
  status: 'ARMED' | 'DISARMED' | 'COMPROMISED';
}

export interface CdticTelemetryData {
  threatFeeds: ThreatIntelligenceFeed[];
  decoyTraps: ActiveDecoyTrap[];
  aptAlertsCount: number;
  malwareHashesDetected: number;
  activeThreatHuntingQueries: number;
  defensePostureLevel: 'DEFCON_1' | 'DEFCON_2' | 'DEFCON_3' | 'DEFCON_4' | 'DEFCON_5';
}

// Asset Discovery & Credential Vault
export interface DiscoveredAsset {
  id: string;
  ipAddress: string;
  macAddress: string;
  hostname: string;
  assetType: 'ORACLE_RAC_NODE' | 'ORACLE_SINGLE_DB' | 'LINUX_SERVER' | 'WINDOWS_SERVER' | 'NETWORK_SWITCH' | 'FIREWALL' | 'K8S_CLUSTER' | 'DOCKER_HOST';
  operatingSystem: string;
  discoveredPorts: number[];
  discoveredServices: string[];
  status: 'REACHABLE' | 'UNREACHABLE' | 'NEEDS_CREDENTIALS';
  lastScannedAt: string;
  subnet: string;
  assignedCredentialId?: string;
}

export interface VaultCredential {
  id: string;
  name: string;
  type: 'SSH_KEY_PAIR' | 'DB_PASSPHRASE' | 'SNMP_V3_COMMUNITY' | 'API_BEARER_TOKEN' | 'SUDO_PASSWORD';
  targetHostOrSubnet: string;
  username: string;
  encryptedSecretPreview: string; // Stored securely AES-256 encrypted
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  createdBy: string;
}

// Auto-Detected Applications on Host Nodes
export interface ServerDetectedApp {
  id: string;
  name: string; // e.g., 'Apache Tomcat 9', 'Oracle WebLogic 14c', 'PACS DICOM Server (Orthanc / dcm4chee)', 'Microsoft IIS', 'Nginx Web Server'
  type: 'TOMCAT' | 'WEBLOGIC' | 'PACS_DICOM' | 'IIS' | 'APACHE' | 'NGINX' | 'DOCKER' | 'POSTGRES' | 'ORACLE_LISTENER' | 'OTHER';
  port: number;
  processPid?: number;
  status: 'RUNNING' | 'STOPPED' | 'DEGRADED';
  memoryMB: number;
  uptime: string;
  version?: string;
  configPath?: string;
}

// WebLogic Portal Types
export interface WebLogicServerInfo {
  id: string;
  nodeName: string;
  hostIp: string;
  domainName: string;
  serverName: string; // e.g. AdminServer, ManagedServer_1
  serverType: 'ADMIN' | 'MANAGED';
  clusterName?: string;
  port: number;
  status: 'RUNNING' | 'SHUTDOWN' | 'SUSPENDED' | 'FAILED';
  heapMemoryUsedMB: number;
  heapMemoryMaxMB: number;
  activeThreads: number;
  jdbcPoolStatus: 'HEALTHY' | 'DEGRADED' | 'FAILED';
  deployedApps: { name: string; type: 'EAR' | 'WAR'; status: 'ACTIVE' | 'PREPARED' }[];
}

// PACS & DICOM Server Portal Types
export interface PacsServerInfo {
  id: string;
  serverName: string;
  hostIp: string;
  aeTitle: string; // Application Entity Title, e.g. PACS_ARCHIVE_01
  dicomPort: number; // e.g. 104, 11112
  webPort: number; // e.g. 8042, 8080
  status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE';
  dicomCEchoStatus: 'SUCCESS' | 'FAILED' | 'PENDING';
  storageUsedGB: number;
  storageTotalGB: number;
  totalStudiesCount: number;
  totalSeriesCount: number;
  totalImagesCount: number;
  connectedModalities: { name: string; aeTitle: string; modalityType: 'CT' | 'MRI' | 'XRAY' | 'US' | 'PET'; ip: string; status: 'ACTIVE' | 'INACTIVE' }[];
}

// WebLogic 4 Core Services (Node Manager, Admin Server, WLS_FORMS, WLS_REPORTS)
export interface WebLogicCoreService {
  id: string;
  serviceKey: 'NODE_MANAGER' | 'ADMIN_SERVER' | 'WLS_FORMS' | 'WLS_REPORTS';
  displayName: string; // e.g. "Node Manager", "Admin Server", "WLS_FORMS", "WLS_REPORTS"
  description: string;
  serverHost: string;
  hostIp: string;
  port: number;
  pid?: number;
  status: 'RUNNING' | 'STOPPED' | 'STARTING' | 'STOPPING' | 'FAILED';
  uptime: string;
  memoryUsedMB: number;
  activeJobsCount: number;
  jobsList: { id: string; name: string; schedule: string; status: 'SUCCESS' | 'RUNNING' | 'PENDING' | 'FAILED'; lastRunTime: string }[];
}

// PACS Required Services for Medical Imaging
export interface PacsEssentialService {
  id: string;
  serviceKey: 'C_STORE_SCP' | 'C_FIND_MOVE' | 'WADO_WEB_VIEWER' | 'WORKLIST_MWL' | 'DICOM_STORAGE_DAEMON';
  displayName: string;
  description: string;
  serverHost: string;
  hostIp: string;
  aeTitle: string;
  port: number;
  pid?: number;
  status: 'RUNNING' | 'STOPPED' | 'MAINTENANCE';
  throughputMbPerSec: number;
  activeDicomAssociations: number;
}

// Comprehensive Server Application Entity for Global Apps Manager Menu
export interface HostServerAppEntity {
  id: string;
  serverId: string;
  serverHostname: string;
  serverIp: string;
  osType: 'WINDOWS_SERVER' | 'RHEL_LINUX' | 'ORACLE_LINUX';
  appName: string; // e.g., 'WebLogic Node Manager', 'WebLogic AdminServer', 'WLS_FORMS', 'WLS_REPORTS', 'PACS DICOM SCP', 'Apache Tomcat 9', 'Oracle DB Listener'
  category: 'WEBLOGIC' | 'PACS_DICOM' | 'TOMCAT' | 'ORACLE_DB' | 'WEB_SERVER' | 'OTHER';
  port: number;
  processPid?: number;
  status: 'RUNNING' | 'STOPPED' | 'DEGRADED' | 'MAINTENANCE';
  memoryMB: number;
  cpuUsagePct: number;
  uptime: string;
  configPath?: string;
  lastHealthCheck: string;
}

export interface CyberProtectionSuite {
  windowsProtection: {
    defenderAntivirusStatus: 'ENABLED' | 'DISABLED';
    ransomwareShieldStatus: 'ENABLED' | 'DISABLED';
    rdpBruteForceAutoBlocker: 'ACTIVE' | 'PAUSED';
    powershellExecutionPolicy: 'Restricted' | 'RemoteSigned' | 'Unrestricted';
    smbv1Disabled: boolean;
    windowsFirewallProfile: 'Domain' | 'Private' | 'Public' | 'Hardened';
    lastMalwareScanTime: string;
    threatsQuarantinedCount: number;
  };
  linuxProtection: {
    selinuxMode: 'Enforcing' | 'Permissive' | 'Disabled';
    fail2banStatus: 'ACTIVE' | 'STOPPED';
    sshRootLoginDisabled: boolean;
    sysctlHardened: boolean;
    auditdIntegrityMonitoring: 'ACTIVE' | 'INACTIVE';
    activeBlockedIpsCount: number;
  };
}

export interface GeoLocationInfo {
  city: string;
  country: string;
  countryCode: string;
  flag: string;
  region: string;
  isp: string;
  lat?: number;
  lon?: number;
}

export interface IntrusionLogEntry {
  id: string;
  timestamp: string;
  clientIp: string;
  hostPcName: string;
  macAddress: string;
  user: string;
  toolName: string;
  endpoint: string;
  targetServer: string;
  location: GeoLocationInfo;
  actionAttempted: string;
  status: 'BLOCKED_BY_FIREWALL' | 'PERMITTED';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  details: string;
}

export interface TargetServerProtectionStatus {
  id: string;
  name: string;
  type: 'RAC_NODE' | 'SINGLE_DB' | 'WINDOWS_DB' | 'WEBLOGIC' | 'PACS';
  ipAddress: string;
  hostname: string;
  osType: string;
  status: 'ONLINE' | 'OFFLINE';
  firewallGuard: 'STRICT_WHITELIST_ACTIVE';
  allowedClientsCount: number;
  blockedAttemptsCount: number;
}

export type VideoStreamType = 'RTSP' | 'HLS' | 'WEBRTC' | 'MJPEG' | 'MP4' | 'X11_VNC' | 'TERMINAL_STREAM' | 'PACS_CINE' | 'ORACLE_REDO_MOTION';
export type VideoStreamCategory = 'CCTV_SECURITY' | 'SERVER_DESKTOP' | 'PACS_CINE' | 'ORACLE_DB_MOTION' | 'DATACENTER_ROOM';

export type InfographicThemePreset =
  | 'executive-white'
  | 'arctic-light-glass'
  | 'emerald-light'
  | 'cyber-blue'
  | 'royal-sapphire-glass'
  | 'synthwave-neon'
  | 'matrix-green'
  | 'solar-amber'
  | 'crimson-alert'
  | 'deep-nebula'
  | 'royal-indigo'
  | 'arctic-frost'
  | 'sunset-coral'
  | 'electric-lime'
  | 'titanium-gray'
  | 'sakura-pink'
  | 'custom-studio';

export interface InfographicThemeConfig {
  preset: InfographicThemePreset;
  particlesEnabled: boolean;
  particleDensity: 'LOW' | 'MEDIUM' | 'HIGH';
  videoScanlines: boolean;
  videoRecHud: boolean;
  spectrumVisualizer: boolean;
  cornerBrackets: boolean;
  cyberGlow: boolean;
  gridCoordinates: boolean;
  themeHue: number;
  transparencyMode?: 'TRANSPARENT_GLASS' | 'SEMI_TRANSLUCENT' | 'SOLID_OPAQUE';
  customPrimaryColor?: string;
  customSecondaryColor?: string;
  accentGlowIntensity?: number;
}

export interface ServerVideoStream {
  id: string;
  name: string;
  nodeId: string;
  nodeName: string;
  category: VideoStreamCategory;
  streamType: VideoStreamType;
  streamUrl: string;
  backupStreamUrl?: string;
  fps: number;
  resolution: string;
  bitrateKbps: number;
  status: 'ONLINE' | 'OFFLINE' | 'BUFFERING' | 'CONNECTING';
  isRecording?: boolean;
  recordingDurationSeconds?: number;
  ptzSupported?: boolean;
  audioEnabled?: boolean;
  nightVision?: boolean;
  lastUpdated: string;
  description?: string;
}



