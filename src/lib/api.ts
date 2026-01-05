/**
 * Service API Client pour communiquer avec le backend
 * Gère l'authentification JWT et toutes les requêtes API
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333/api/v1'

export interface ApiResponse<T = any> {
  data?: T
  message?: string
  errors?: any
}

export interface LoginResponse {
  user: {
    id: string
    email: string
    fullName: string
    role: string
    roles?: any[]
    isActive: boolean
  }
  token: string
}

export interface User {
  id: string
  email: string
  fullName: string
  role: string
  roles?: any[]
  isActive: boolean
}

export interface Bon {
  id: string
  bonNumber: string
  bonTypeId: string
  createdBy: string
  siteId?: string | null
  siteName?: string | null
  values: any // JSON string ou objet parsé
  status: 'DRAFT' | 'SUBMITTED' | 'VALIDATED' | 'SIGNED' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'USED'
  version: number
  bonType?: BonType
  creator?: any
  approvers?: any[]
  signatures?: any[]
  scanLogs?: any[]
  createdAt?: string
  updatedAt?: string
  expirationDate?: string | null
  qrCode?: string | null
  qrToken?: string | null
  pdfUrl?: string | null
  pdfHash?: string | null
  digitalSignatureData?: string | null
}

export interface BonType {
  id: string
  name: string
  code: string
  description?: string | null
  formStructure?: string | any // String JSON côté backend, peut être parsé côté frontend
  workflowConfig?: string | any | null
  signatureConfig?: string | any | null
  documentTemplate?: string | any | null
  qrConfig?: string | any | null
  status: 'active' | 'inactive'
  createdBy: string
  fields?: BonField[] // Relation préchargée (champs simples, hors groupes)
  fieldGroups?: BonFieldGroup[] // Relation préchargée (groupes de champs)
  workflows?: any[]
  createdAt?: string
  updatedAt?: string
}

export interface BonField {
  id: string
  bonTypeId: string
  bonFieldGroupId?: string | null // null = champ simple (hors groupe), défini = appartient à un groupe
  name: string
  label: string
  type: 'text' | 'number' | 'date' | 'datetime' | 'select' | 'checkbox'
  required: boolean
  validationRules?: string | any | null
  options?: string | any | null // JSON string pour select
  order: number
  createdAt?: string
  updatedAt?: string
}

export interface BonFieldGroup {
  id: string
  bonTypeId: string
  name: string // Nom technique du groupe (ex: "invoice_line")
  label: string // Label affiché (ex: "Ligne de facture")
  description?: string | null
  isRepeatable: boolean // true = peut être répété (tableau), false = une seule instance
  order: number
  minRepeats?: number | null // Nombre minimum de répétitions (si repeatable)
  maxRepeats?: number | null // Nombre maximum de répétitions (si repeatable)
  fields?: BonField[] // Champs du groupe (relation préchargée)
  createdAt?: string
  updatedAt?: string
}

export interface PDFTemplateSection {
  id: string
  type: 'header' | 'company_header' | 'text' | 'table' | 'image' | 'qr_code' | 'signature' | 'footer' | 'spacer'
  position?: {
    x: number
    y: number
    width?: number
    height?: number
  }
  style?: {
    fontSize?: number
    fontFamily?: string
    fontWeight?: 'normal' | 'bold' | 'italic'
    color?: string
    alignment?: 'left' | 'center' | 'right' | 'justify'
    margin?: number | { top?: number; bottom?: number; left?: number; right?: number }
    padding?: number | { top?: number; bottom?: number; left?: number; right?: number }
    backgroundColor?: string
    border?: { width?: number; color?: string; style?: 'solid' | 'dashed' }
  }
  content?: any
  dataBinding?: string
  conditional?: {
    field: string
    operator: 'equals' | 'not_equals' | 'exists' | 'not_exists'
    value?: any
  }
  companyHeaderConfig?: {
    showLogo?: boolean
    logoPosition?: 'left' | 'right' | 'center'
    logoSize?: { width: number; height: number }
    showCompanyName?: boolean
    showCompanyAddress?: boolean
    showCompanyContact?: boolean
    layout?: 'horizontal' | 'vertical'
  }
}

export interface PDFField {
  id: string
  fieldName: string
  position: {
    x: number
    y: number
    width?: number
    height?: number
    page?: number
  }
  style?: {
    fontSize?: number
    fontFamily?: string
    color?: string
    alignment?: 'left' | 'center' | 'right'
    bold?: boolean
    italic?: boolean
  }
  isArray?: boolean
  tableInfo?: {
    rowIndex: number
    columnIndex: number
    tableId: string
  }
}

export interface PDFTemplate {
  id?: string
  name?: string
  description?: string
  pageSize?: 'A4' | 'A3' | 'Letter' | 'Legal'
  orientation?: 'portrait' | 'landscape'
  margins?: {
    top: number
    bottom: number
    left: number
    right: number
  }
  // PDF template généré côté frontend (base64)
  templateFileBase64?: string
  // Positions exactes des champs calculées depuis le DOM
  fields?: PDFField[]
  // Contenu HTML de l'éditeur WYSIWYG (nouveau format)
  content?: string
  // Compatibilité avec l'ancienne structure
  layout?: {
    pageSize: string
    orientation: string
    margins: {
      top: number
      right: number
      bottom: number
      left: number
    }
  }
  sections?: PDFTemplateSection[] // Ancien format, conservé pour compatibilité
  body?: any[] // Ancienne structure, sera convertie en sections
  header?: any // Ancienne structure
  footer?: any // Ancienne structure
  styles?: {
    primaryColor?: string
    secondaryColor?: string
    fontFamily?: string
    defaultFontSize?: number
  }
  companyInfo?: {
    name: string
    logo?: string
    address?: string
    city?: string
    postalCode?: string
    country?: string
    phone?: string
    email?: string
    website?: string
  }
  version?: number
  createdAt?: string
  updatedAt?: string
}

class ApiClient {
  private baseURL: string

  constructor() {
    this.baseURL = API_BASE_URL
  }

  /**
   * Méthode privée pour effectuer les requêtes HTTP
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

    const headersInit: HeadersInit = new Headers(options.headers)
    headersInit.set('Content-Type', 'application/json')

    if (token) {
      headersInit.set('Authorization', `Bearer ${token}`)
    }

    const url = `${this.baseURL}${endpoint}`
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: headersInit,
      })

      // Si 401, rediriger vers login
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          window.location.href = '/login'
        }
        throw new Error('Non autorisé')
      }

      // Si erreur, lancer une exception
      if (!response.ok) {
        let errorData: any
        try {
          errorData = await response.json()
        } catch {
          errorData = { message: 'Erreur serveur' }
        }
        
        // Gérer les erreurs de validation (400)
        if (response.status === 400) {
          const errorMessage = errorData.message || 
                              errorData.errors?.map((e: any) => e.message || e).join(', ') ||
                              'Données invalides'
          throw new Error(errorMessage)
        }
        
        throw new Error(errorData.message || `Erreur ${response.status}`)
      }

      // Retourner les données JSON
      return await response.json()
    } catch (error: any) {
      // Si c'est déjà une erreur qu'on a créée, la relancer
      if (error.message) {
        throw error
      }
      // Sinon, erreur réseau
      throw new Error('Erreur de connexion au serveur')
    }
  }

  // ==================== AUTHENTIFICATION ====================

  /**
   * Connexion d'un utilisateur
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    return this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  /**
   * Inscription d'un nouvel utilisateur
   */
  async register(data: {
    email: string
    password: string
    fullName: string
    role?: string
  }): Promise<LoginResponse> {
    return this.request<LoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * Récupérer les informations de l'utilisateur connecté
   */
  async getMe(): Promise<User> {
    return this.request<User>('/auth/me')
  }

  /**
   * Déconnexion
   */
  async logout(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/logout', {
      method: 'POST',
    })
  }

  // ==================== BONS ====================

  /**
   * Récupérer la liste des bons (avec pagination)
   */
  async getBons(params?: {
    page?: number
    limit?: number
    status?: string
    bonTypeId?: string | number
  }): Promise<{
    data: Bon[]
    meta: {
      total: number
      perPage: number
      currentPage: number
      lastPage: number
      firstPage: number
    }
  }> {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.status) queryParams.append('status', params.status)
    if (params?.bonTypeId) queryParams.append('bonTypeId', params.bonTypeId.toString())

    const query = queryParams.toString()
    const response = await this.request<{
      data: Bon[]
      meta: {
        total: number
        perPage: number
        currentPage: number
        lastPage: number
        firstPage: number
      }
    }>(`/bons${query ? `?${query}` : ''}`)
    
    // Parser values pour chaque bon si c'est une string JSON
    response.data = response.data.map(bon => {
      if (bon.values && typeof bon.values === 'string') {
        try {
          bon.values = JSON.parse(bon.values)
        } catch (e) {
          console.error('Error parsing bon values:', e)
          bon.values = {}
        }
      }
      return bon
    })
    
    return response
  }

  /**
   * Récupérer un bon par son ID
   */
  async getBon(id: string | number): Promise<Bon> {
    const bon = await this.request<Bon>(`/bons/${id}`)
    // Parser values si c'est une string JSON
    if (bon.values && typeof bon.values === 'string') {
      try {
        bon.values = JSON.parse(bon.values)
      } catch (e) {
        console.error('Error parsing bon values:', e)
        bon.values = {}
      }
    }
    return bon
  }

  /**
   * Créer un nouveau bon
   */
  async createBon(data: {
    bonTypeId: string | number
    siteId?: string
    siteName?: string
    values: any
  }): Promise<Bon> {
    return this.request<Bon>('/bons', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * Mettre à jour un bon
   */
  async updateBon(id: string | number, data: Partial<Bon>): Promise<Bon> {
    return this.request<Bon>(`/bons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  /**
   * Signer un bon
   */
  async signBon(id: string | number, data: {
    signatureMethod: string
    otpCode?: string
    signatureData?: any
    consentGiven: boolean
  }): Promise<any> {
    return this.request(`/bons/${id}/sign`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * Approuver un bon
   */
  async approveBon(id: string | number): Promise<any> {
    return this.request(`/bons/${id}/approve`, {
      method: 'POST',
    })
  }

  /**
   * Rejeter un bon
   */
  async rejectBon(id: string | number, reason?: string): Promise<any> {
    return this.request(`/bons/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    })
  }

  /**
   * Récupérer le PDF d'un bon (URL)
   */
  getBonPDFUrl(id: string | number): string {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    return `${this.baseURL}/bons/${id}/pdf?token=${token}`
  }

  /**
   * Télécharger le PDF d'un bon
   */
  async downloadBonPDF(id: string | number): Promise<Blob> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const response = await fetch(`${this.baseURL}/bons/${id}/pdf/download`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    if (!response.ok) throw new Error('Erreur lors du téléchargement')
    return response.blob()
  }

  // ==================== TYPES DE BONS ====================

  /**
   * Récupérer la liste des types de bons
   */
  async getBonTypes(): Promise<BonType[]> {
    const bonTypes = await this.request<BonType[]>('/bon-types')
    console.log('Raw bon types from API:', bonTypes)
    
    // Parser formStructure si c'est une string JSON
    return bonTypes.map(bt => {
      console.log(`Processing bon type ${bt.id}:`, {
        hasFields: !!bt.fields,
        fieldsCount: bt.fields?.length || 0,
        hasFormStructure: !!bt.formStructure,
        formStructureType: typeof bt.formStructure
      })
      
      if (bt.formStructure && typeof bt.formStructure === 'string') {
        try {
          bt.formStructure = JSON.parse(bt.formStructure)
        } catch (e) {
          console.error('Error parsing formStructure:', e)
          bt.formStructure = { fields: [] }
        }
      }
      // Si pas de formStructure OU formStructure.fields est vide, mais qu'on a des fields (relation), créer formStructure
      const hasFormStructureFields = bt.formStructure?.fields && bt.formStructure.fields.length > 0
      const hasFields = bt.fields && bt.fields.length > 0
      
      if (!hasFormStructureFields && hasFields) {
        console.log('Creating formStructure from fields for bon type:', bt.id, 'fields:', bt.fields)
        bt.formStructure = {
          ...(bt.formStructure || {}),
          fields: (bt.fields || []).map((field: any) => {
            // Parser les options pour les champs select
            let parsedOptions = undefined
            if (field.options) {
              if (typeof field.options === 'string') {
                try {
                  parsedOptions = JSON.parse(field.options)
                } catch (e) {
                  console.error('Error parsing field options:', e)
                  // Si le parsing échoue, essayer de traiter comme un tableau de strings
                  parsedOptions = field.options.split(',').map((opt: string) => opt.trim())
                }
              } else {
                parsedOptions = field.options
              }
            }

            // Parser les validationRules
            let parsedValidationRules = undefined
            if (field.validationRules) {
              if (typeof field.validationRules === 'string') {
                try {
                  parsedValidationRules = JSON.parse(field.validationRules)
                } catch (e) {
                  console.error('Error parsing field validationRules:', e)
                }
              } else {
                parsedValidationRules = field.validationRules
              }
            }

            return {
              name: field.name,
              label: field.label,
              type: field.type,
              required: field.required,
              placeholder: field.label,
              options: parsedOptions,
              validationRules: parsedValidationRules,
              order: field.order,
            }
          })
        }
        console.log('Created formStructure:', bt.formStructure)
      }
      return bt
    })
  }

  /**
   * Récupérer un type de bon par son ID
   */
  async getBonType(id: string | number): Promise<BonType> {
    const bonType = await this.request<BonType>(`/bon-types/${id}`)
    // Parser formStructure si c'est une string JSON
    if (bonType.formStructure && typeof bonType.formStructure === 'string') {
      try {
        bonType.formStructure = JSON.parse(bonType.formStructure)
      } catch (e) {
        console.error('Error parsing formStructure:', e)
        bonType.formStructure = { fields: [] }
      }
    }
    // Si pas de formStructure mais des fields (relation), créer formStructure
    if (!bonType.formStructure?.fields && bonType.fields && bonType.fields.length > 0) {
      bonType.formStructure = {
        fields: bonType.fields.map((field: any) => ({
          name: field.name,
          label: field.label,
          type: field.type,
          required: field.required,
          placeholder: field.label,
          options: field.options ? (typeof field.options === 'string' ? JSON.parse(field.options) : field.options) : undefined,
          validationRules: field.validationRules ? (typeof field.validationRules === 'string' ? JSON.parse(field.validationRules) : field.validationRules) : undefined,
          order: field.order,
        }))
      }
    }
    return bonType
  }

  /**
   * Créer un nouveau type de bon
   */
  async createBonType(data: Partial<BonType>): Promise<BonType> {
    return this.request<BonType>('/bon-types', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * Mettre à jour un type de bon
   */
  async updateBonType(id: string | number, data: Partial<BonType>): Promise<BonType> {
    return this.request<BonType>(`/bon-types/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  /**
   * Supprimer un type de bon
   */
  async deleteBonType(id: string | number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/bon-types/${id}`, {
      method: 'DELETE',
    })
  }

  // ==================== TEMPLATES PDF ====================

  /**
   * Récupérer le template PDF d'un type de bon
   */
  async getTemplate(bonTypeId: string | number): Promise<PDFTemplate> {
    return this.request<PDFTemplate>(`/bon-types/${bonTypeId}/pdf-template`)
  }

  /**
   * Sauvegarder le template PDF d'un type de bon
   */
  async saveTemplate(bonTypeId: string | number, template: PDFTemplate): Promise<{
    message: string
    template: PDFTemplate
  }> {
    return this.request(`/bon-types/${bonTypeId}/pdf-template`, {
      method: 'POST',
      body: JSON.stringify(template),
    })
  }

  /**
   * Créer un template par défaut pour un type de bon
   */
  async createDefaultTemplate(bonTypeId: string | number): Promise<{
    message: string
    template: PDFTemplate
  }> {
    return this.request(`/bon-types/${bonTypeId}/pdf-template/default`, {
      method: 'POST',
    })
  }

  /**
   * Prévisualiser un template
   */
  async previewTemplate(bonTypeId: string | number, template: PDFTemplate): Promise<any> {
    return this.request(`/bon-types/${bonTypeId}/pdf-template/preview`, {
      method: 'POST',
      body: JSON.stringify(template),
    })
  }

  /**
   * Dupliquer un template
   */
  async duplicateTemplate(
    bonTypeId: string | number,
    targetBonTypeId: string | number
  ): Promise<any> {
    return this.request(`/bon-types/${bonTypeId}/pdf-template/duplicate`, {
      method: 'POST',
      body: JSON.stringify({ targetBonTypeId }),
    })
  }

  // ==================== UTILISATEURS ====================

  /**
   * Récupérer la liste des utilisateurs (avec pagination)
   */
  async getUsers(params?: {
    page?: number
    limit?: number
    search?: string
    role?: string
  }): Promise<{
    data: User[]
    meta: {
      total: number
      perPage: number
      currentPage: number
      lastPage: number
      firstPage: number
    }
  }> {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.search) queryParams.append('search', params.search)
    if (params?.role) queryParams.append('role', params.role)

    const query = queryParams.toString()
    return this.request(`/users${query ? `?${query}` : ''}`)
  }

  /**
   * Récupérer un utilisateur par son ID
   */
  async getUser(id: string | number): Promise<User> {
    return this.request<User>(`/users/${id}`)
  }

  /**
   * Mettre à jour un utilisateur
   */
  async updateUser(id: string | number, data: {
    fullName?: string
    email?: string
    isActive?: boolean
    role?: string
  }): Promise<User> {
    return this.request<User>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  /**
   * Assigner des rôles à un utilisateur
   */
  async assignUserRoles(id: string | number, roleIds: (string | number)[]): Promise<User> {
    return this.request<User>(`/users/${id}/roles/assign`, {
      method: 'POST',
      body: JSON.stringify({ roleIds }),
    })
  }

  /**
   * Ajouter un rôle à un utilisateur
   */
  async attachUserRole(id: string | number, roleId: string | number): Promise<User> {
    return this.request<User>(`/users/${id}/roles/attach`, {
      method: 'POST',
      body: JSON.stringify({ roleId }),
    })
  }

  /**
   * Retirer un rôle d'un utilisateur
   */
  async detachUserRole(id: string | number, roleId: string | number): Promise<User> {
    return this.request<User>(`/users/${id}/roles/detach`, {
      method: 'POST',
      body: JSON.stringify({ roleId }),
    })
  }

  /**
   * Désactiver un utilisateur
   */
  async deactivateUser(id: string | number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/users/${id}/deactivate`, {
      method: 'POST',
    })
  }

  /**
   * Activer un utilisateur
   */
  async activateUser(id: string | number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/users/${id}/activate`, {
      method: 'POST',
    })
  }

  // ==================== ROLES & PERMISSIONS ====================

  /**
   * Récupérer la liste des rôles
   */
  async getRoles(): Promise<any[]> {
    return this.request<any[]>('/roles')
  }

  /**
   * Créer un nouveau rôle
   */
  async createRole(data: any): Promise<any> {
    return this.request('/roles', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * Récupérer la liste des permissions
   */
  async getPermissions(): Promise<any[]> {
    return this.request<any[]>('/permissions')
  }

  /**
   * Créer une nouvelle permission
   */
  async createPermission(data: any): Promise<any> {
    return this.request('/permissions', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // ==================== CHAMPS DE BON ====================

  /**
   * Récupérer tous les champs d'un type de bon
   */
  async getBonFields(bonTypeId: string | number): Promise<BonField[]> {
    const fields = await this.request<BonField[]>(`/bon-types/${bonTypeId}/fields`)
    // Parser options et validationRules si ce sont des strings JSON
    return fields.map(field => {
      if (field.options && typeof field.options === 'string') {
        try {
          field.options = JSON.parse(field.options)
        } catch (e) {
          console.error('Error parsing field options:', e)
        }
      }
      if (field.validationRules && typeof field.validationRules === 'string') {
        try {
          field.validationRules = JSON.parse(field.validationRules)
        } catch (e) {
          console.error('Error parsing field validationRules:', e)
        }
      }
      return field
    })
  }

  /**
   * Créer un nouveau champ pour un type de bon
   */
  async createBonField(bonTypeId: string | number, data: Partial<BonField>): Promise<BonField> {
    return this.request<BonField>(`/bon-types/${bonTypeId}/fields`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * Mettre à jour un champ
   */
  async updateBonField(
    bonTypeId: string | number,
    fieldId: string | number,
    data: Partial<BonField>
  ): Promise<BonField> {
    return this.request<BonField>(`/bon-types/${bonTypeId}/fields/${fieldId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  /**
   * Supprimer un champ
   */
  async deleteBonField(bonTypeId: string | number, fieldId: string | number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/bon-types/${bonTypeId}/fields/${fieldId}`, {
      method: 'DELETE',
    })
  }

  // ==================== GROUPES DE CHAMPS ====================

  /**
   * Récupérer tous les groupes de champs d'un type de bon
   */
  async getBonFieldGroups(bonTypeId: string | number): Promise<BonFieldGroup[]> {
    const groups = await this.request<BonFieldGroup[]>(`/bon-types/${bonTypeId}/field-groups`)
    // Parser les fields de chaque groupe
    return groups.map(group => {
      if (group.fields) {
        group.fields = group.fields.map(field => {
          if (field.options && typeof field.options === 'string') {
            try {
              field.options = JSON.parse(field.options)
            } catch (e) {
              console.error('Error parsing field options:', e)
            }
          }
          if (field.validationRules && typeof field.validationRules === 'string') {
            try {
              field.validationRules = JSON.parse(field.validationRules)
            } catch (e) {
              console.error('Error parsing field validationRules:', e)
            }
          }
          return field
        })
      }
      return group
    })
  }

  /**
   * Récupérer un groupe de champs par son ID
   */
  async getBonFieldGroup(bonTypeId: string | number, groupId: string | number): Promise<BonFieldGroup> {
    return this.request<BonFieldGroup>(`/bon-types/${bonTypeId}/field-groups/${groupId}`)
  }

  /**
   * Créer un nouveau groupe de champs
   */
  async createBonFieldGroup(bonTypeId: string | number, data: Partial<BonFieldGroup>): Promise<BonFieldGroup> {
    return this.request<BonFieldGroup>(`/bon-types/${bonTypeId}/field-groups`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * Mettre à jour un groupe de champs
   */
  async updateBonFieldGroup(
    bonTypeId: string | number,
    groupId: string | number,
    data: Partial<BonFieldGroup>
  ): Promise<BonFieldGroup> {
    return this.request<BonFieldGroup>(`/bon-types/${bonTypeId}/field-groups/${groupId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  /**
   * Supprimer un groupe de champs
   */
  async deleteBonFieldGroup(bonTypeId: string | number, groupId: string | number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/bon-types/${bonTypeId}/field-groups/${groupId}`, {
      method: 'DELETE',
    })
  }
}

// Export d'une instance unique du client API
export const api = new ApiClient()
export default api

