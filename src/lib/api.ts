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

export interface Document {
  id: string
  documentNumber: string
  documentTypeId: string
  createdBy: string
  siteId?: string | null
  siteName?: string | null
  values: any // JSON string ou objet parsé
  status: 'DRAFT' | 'SUBMITTED' | 'IN_PROGRESS' | 'VALIDATED' | 'SIGNED' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'USED'
  version: number
  documentType?: DocumentType
  creator?: any
  approvers?: any[]
  signatures?: any[]
  scanLogs?: any[]
  linkedDocuments?: Document[]
  sourceLinks?: Array<{
    id: string
    linkType: string
    targetDocument: Document
  }>
  targetLinks?: Array<{
    id: string
    linkType: string
    sourceDocument: Document
  }>
  createdAt?: string
  updatedAt?: string
  expirationDate?: string | null
  qrCode?: string | null
  qrToken?: string | null
  pdfUrl?: string | null
  pdfHash?: string | null
  digitalSignatureData?: string | null
}

export interface Category {
  id: string
  name: string
  code: string
  description?: string | null
  color?: string | null
  status: 'active' | 'inactive'
  createdBy: string
  createdAt?: string
  updatedAt?: string
}

export interface DocumentType {
  id: string
  name: string
  code: string
  description?: string | null
  categoryId?: string | null
  category?: Category | null // Relation préchargée
  formStructure?: string | any // String JSON côté backend, peut être parsé côté frontend
  workflowConfig?: string | any | null
  signatureConfig?: string | any | null
  documentTemplate?: string | any | null
  qrConfig?: string | any | null
  status: 'active' | 'inactive'
  createdBy: string
  fields?: DocumentField[] // Relation préchargée (champs simples, hors groupes)
  fieldGroups?: DocumentFieldGroup[] // Relation préchargée (groupes de champs)
  workflows?: any[]
  createdAt?: string
  updatedAt?: string
}

export interface DocumentField {
  id: string
  documentTypeId: string
  documentFieldGroupId?: string | null // null = champ simple (hors groupe), défini = appartient à un groupe
  name: string
  label: string
  type: 'text' | 'number' | 'date' | 'datetime' | 'select' | 'checkbox' | 'textarea' | 'file' | 'document_link'
  required: boolean
  validationRules?: string | any | null
  options?: string | any | null // JSON string pour select
  order: number
  createdAt?: string
  updatedAt?: string
}

export interface DocumentFieldGroup {
  id: string
  documentTypeId: string
  name: string // Nom technique du groupe (ex: "invoice_line")
  label: string // Label affiché (ex: "Ligne de facture")
  description?: string | null
  isRepeatable: boolean // true = peut être répété (tableau), false = une seule instance
  order: number
  minRepeats?: number | null // Nombre minimum de répétitions (si repeatable)
  maxRepeats?: number | null // Nombre maximum de répétitions (si repeatable)
  fields?: DocumentField[] // Champs du groupe (relation préchargée)
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

  // ==================== DOCUMENTS ====================

  /**
   * Récupérer la liste des documents (avec pagination)
   */
  async getDocuments(params?: {
    page?: number
    limit?: number
    status?: string
    documentTypeId?: string | number
  }): Promise<{
    data: Document[]
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
    if (params?.documentTypeId) queryParams.append('documentTypeId', params.documentTypeId.toString())

    const query = queryParams.toString()
    const response = await this.request<{
      data: Document[]
      meta: {
        total: number
        perPage: number
        currentPage: number
        lastPage: number
        firstPage: number
      }
    }>(`/documents${query ? `?${query}` : ''}`)
    
    // Parser values pour chaque document si c'est une string JSON
    response.data = response.data.map(document => {
      if (document.values && typeof document.values === 'string') {
        try {
          document.values = JSON.parse(document.values)
        } catch (e) {
          console.error('Error parsing document values:', e)
          document.values = {}
        }
      }
      return document
    })
    
    return response
  }

  /**
   * Récupérer un document par son ID
   */
  async getDocument(id: string | number): Promise<Document> {
    const document = await this.request<Document>(`/documents/${id}`)
    // Parser values si c'est une string JSON
    if (document.values && typeof document.values === 'string') {
      try {
        document.values = JSON.parse(document.values)
      } catch (e) {
        console.error('Error parsing document values:', e)
        document.values = {}
      }
    }
    return document
  }

  /**
   * Créer un nouveau document
   */
  async createDocument(data: {
    documentTypeId: string | number
    siteId?: string
    siteName?: string
    values: any
    signers?: Array<{ userId: string; order: number }>
  }): Promise<Document> {
    return this.request<Document>('/documents', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * Mettre à jour un document
   */
  async updateDocument(id: string | number, data: Partial<Document>): Promise<Document> {
    return this.request<Document>(`/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  /**
   * Signer un document
   */
  async signDocument(id: string | number, data: {
    signatureMethod?: string
    otpCode?: string
    signatureData?: any
    consentGiven: boolean
    signatureType?: 'digital' | 'visual' | 'pad' | 'name'
    signatureId?: string // ID d'une signature sauvegardée
    signatureName?: string // Nom personnalisé pour génération depuis nom
  }): Promise<any> {
    return this.request(`/documents/${id}/sign`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * Ajouter des signataires à un document avec leur ordre
   */
  async addDocumentSigners(id: string | number, signers: Array<{
    userId: string
    order: number
  }>): Promise<{
    message: string
    signers: Array<{
      id: string
      fullName: string
      email: string
      role: string
      order: number
      hasSigned: boolean
    }>
  }> {
    return this.request(`/documents/${id}/signers`, {
      method: 'POST',
      body: JSON.stringify({ signers }),
    })
  }

  /**
   * Récupérer les signataires d'un document
   */
  async getDocumentSigners(id: string | number): Promise<{
    signers: Array<{
      id: string
      fullName: string
      email: string
      role: string
      order: number
      hasSigned: boolean
      signedAt?: string
      signatureMethod?: string
    }>
  }> {
    return this.request(`/documents/${id}/signers`)
  }

  /**
   * Approuver un document
   */
  async approveDocument(id: string | number): Promise<any> {
    return this.request(`/documents/${id}/approve`, {
      method: 'POST',
    })
  }

  /**
   * Rejeter un document
   */
  async rejectDocument(id: string | number, reason?: string): Promise<any> {
    return this.request(`/documents/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    })
  }

  /**
   * Lier un document à un autre document
   */
  async linkDocument(id: string | number, data: {
    targetDocumentId: string
    linkType: string
    linkMethod?: string
    metadata?: any
  }): Promise<any> {
    return this.request(`/documents/${id}/link`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * Lier un document via QR code
   */
  async linkDocumentByQR(id: string | number, qrCode: string): Promise<any> {
    return this.request(`/documents/${id}/link-by-qr`, {
      method: 'POST',
      body: JSON.stringify({ qrCode }),
    })
  }

  /**
   * Récupérer les documents liés
   */
  async getLinkedDocuments(id: string | number): Promise<{
    linkedDocuments: Document[]
  }> {
    return this.request(`/documents/${id}/linked`)
  }

  /**
   * Délier un document
   */
  async unlinkDocument(id: string | number, linkId: string): Promise<any> {
    return this.request(`/documents/${id}/link/${linkId}`, {
      method: 'DELETE',
    })
  }

  /**
   * Récupérer le PDF d'un document (URL)
   */
  getDocumentPDFUrl(id: string | number): string {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    return `${this.baseURL}/documents/${id}/pdf?token=${token}`
  }

  /**
   * Télécharger le PDF d'un document
   */
  async downloadDocumentPDF(id: string | number): Promise<Blob> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) {
      throw new Error('Token d\'authentification manquant')
    }

    try {
      const response = await fetch(`${this.baseURL}/documents/${id}/pdf/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/pdf',
        },
      })

      if (!response.ok) {
        // Essayer de récupérer le message d'erreur du backend
        let errorMessage = 'Erreur lors du téléchargement'
        try {
          const errorData = await response.json()
          errorMessage = errorData.message || errorData.error || errorMessage
        } catch {
          // Si la réponse n'est pas du JSON, utiliser le statut
          errorMessage = `Erreur ${response.status}: ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      // Vérifier que la réponse est bien un PDF
      const contentType = response.headers.get('content-type')
      if (contentType && !contentType.includes('application/pdf')) {
        console.warn('Réponse inattendue:', contentType)
      }

      return await response.blob()
    } catch (error: any) {
      console.error('Error downloading PDF:', error)
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Erreur lors du téléchargement du PDF')
    }
  }

  // ==================== CATEGORIES ====================

  /**
   * Récupérer la liste des catégories
   */
  async getCategories(params?: { status?: string }): Promise<Category[]> {
    const queryParams = new URLSearchParams()
    if (params?.status) queryParams.append('status', params.status)

    const query = queryParams.toString()
    return this.request<Category[]>(`/categories${query ? `?${query}` : ''}`)
  }

  /**
   * Récupérer une catégorie par son ID
   */
  async getCategory(id: string | number): Promise<Category> {
    return this.request<Category>(`/categories/${id}`)
  }

  /**
   * Créer une nouvelle catégorie
   */
  async createCategory(data: Partial<Category>): Promise<Category> {
    return this.request<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * Mettre à jour une catégorie
   */
  async updateCategory(id: string | number, data: Partial<Category>): Promise<Category> {
    return this.request<Category>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  /**
   * Supprimer une catégorie
   */
  async deleteCategory(id: string | number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/categories/${id}`, {
      method: 'DELETE',
    })
  }

  // ==================== TYPES DE DOCUMENTS ====================

  /**
   * Récupérer la liste des types de documents
   */
  async getDocumentTypes(params?: { categoryId?: string }): Promise<DocumentType[]> {
    const queryParams = new URLSearchParams()
    if (params?.categoryId) queryParams.append('categoryId', params.categoryId)

    const query = queryParams.toString()
    const documentTypes = await this.request<DocumentType[]>(`/document-types${query ? `?${query}` : ''}`)
    console.log('Raw document types from API:', documentTypes)
    
    // Parser formStructure si c'est une string JSON
    return documentTypes.map(dt => {
      console.log(`Processing document type ${dt.id}:`, {
        hasFields: !!dt.fields,
        fieldsCount: dt.fields?.length || 0,
        hasFormStructure: !!dt.formStructure,
        formStructureType: typeof dt.formStructure
      })
      
      if (dt.formStructure && typeof dt.formStructure === 'string') {
        try {
          dt.formStructure = JSON.parse(dt.formStructure)
        } catch (e) {
          console.error('Error parsing formStructure:', e)
          dt.formStructure = { fields: [] }
        }
      }
      // Si pas de formStructure OU formStructure.fields est vide, mais qu'on a des fields (relation), créer formStructure
      const hasFormStructureFields = dt.formStructure?.fields && dt.formStructure.fields.length > 0
      const hasFields = dt.fields && dt.fields.length > 0
      
      if (!hasFormStructureFields && hasFields) {
        console.log('Creating formStructure from fields for document type:', dt.id, 'fields:', dt.fields)
        dt.formStructure = {
          ...(dt.formStructure || {}),
          fields: (dt.fields || []).map((field: any) => {
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
        console.log('Created formStructure:', dt.formStructure)
      }
      return dt
    })
  }

  /**
   * Récupérer un type de document par son ID
   */
  async getDocumentType(id: string | number): Promise<DocumentType> {
    const documentType = await this.request<DocumentType>(`/document-types/${id}`)
    // Parser formStructure si c'est une string JSON
    if (documentType.formStructure && typeof documentType.formStructure === 'string') {
      try {
        documentType.formStructure = JSON.parse(documentType.formStructure)
      } catch (e) {
        console.error('Error parsing formStructure:', e)
        documentType.formStructure = { fields: [] }
      }
    }
    // Si pas de formStructure mais des fields (relation), créer formStructure
    if (!documentType.formStructure?.fields && documentType.fields && documentType.fields.length > 0) {
      documentType.formStructure = {
        fields: documentType.fields.map((field: any) => ({
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
    return documentType
  }

  /**
   * Créer un nouveau type de document
   */
  async createDocumentType(data: Partial<DocumentType>): Promise<DocumentType> {
    // S'assurer que categoryId est envoyé au lieu de category
    const { category, ...restData } = data as any
    const payload = {
      ...restData,
      categoryId: data.categoryId || null,
    }
    return this.request<DocumentType>('/document-types', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  /**
   * Mettre à jour un type de document
   */
  async updateDocumentType(id: string | number, data: Partial<DocumentType>): Promise<DocumentType> {
    // S'assurer que categoryId est envoyé au lieu de category
    const { category, ...restData } = data as any
    const payload = {
      ...restData,
      categoryId: data.categoryId !== undefined ? data.categoryId : null,
    }
    return this.request<DocumentType>(`/document-types/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  }

  /**
   * Supprimer un type de document
   */
  async deleteDocumentType(id: string | number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/document-types/${id}`, {
      method: 'DELETE',
    })
  }

  // ==================== TEMPLATES PDF ====================

  /**
   * Récupérer le template PDF d'un type de document
   */
  async getTemplate(documentTypeId: string | number): Promise<PDFTemplate> {
    return this.request<PDFTemplate>(`/document-types/${documentTypeId}/pdf-template`)
  }

  /**
   * Sauvegarder le template PDF d'un type de document
   */
  async saveTemplate(documentTypeId: string | number, template: PDFTemplate): Promise<{
    message: string
    template: PDFTemplate
  }> {
    return this.request(`/document-types/${documentTypeId}/pdf-template`, {
      method: 'POST',
      body: JSON.stringify(template),
    })
  }

  /**
   * Créer un template par défaut pour un type de document
   */
  async createDefaultTemplate(documentTypeId: string | number): Promise<{
    message: string
    template: PDFTemplate
  }> {
    return this.request(`/document-types/${documentTypeId}/pdf-template/default`, {
      method: 'POST',
    })
  }

  /**
   * Prévisualiser un template
   */
  async previewTemplate(documentTypeId: string | number, template: PDFTemplate): Promise<any> {
    return this.request(`/document-types/${documentTypeId}/pdf-template/preview`, {
      method: 'POST',
      body: JSON.stringify(template),
    })
  }

  /**
   * Dupliquer un template
   */
  async duplicateTemplate(
    documentTypeId: string | number,
    targetDocumentTypeId: string | number
  ): Promise<any> {
    return this.request(`/document-types/${documentTypeId}/pdf-template/duplicate`, {
      method: 'POST',
      body: JSON.stringify({ targetDocumentTypeId }),
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
    password?: string
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
   * Récupérer un rôle par son ID
   */
  async getRole(id: string | number): Promise<any> {
    return this.request<any>(`/roles/${id}`)
  }

  /**
   * Créer un nouveau rôle
   */
  async createRole(data: {
    name: string
    code: string
    description?: string
    permissionIds?: (string | number)[]
  }): Promise<any> {
    return this.request('/roles', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * Mettre à jour un rôle
   */
  async updateRole(id: string | number, data: {
    name?: string
    description?: string
    isActive?: boolean
    permissionIds?: (string | number)[]
  }): Promise<any> {
    return this.request(`/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  /**
   * Supprimer un rôle
   */
  async deleteRole(id: string | number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/roles/${id}`, {
      method: 'DELETE',
    })
  }

  /**
   * Attacher des permissions à un rôle
   */
  async attachRolePermissions(id: string | number, permissionIds: (string | number)[]): Promise<any> {
    return this.request(`/roles/${id}/permissions/attach`, {
      method: 'POST',
      body: JSON.stringify({ permissionIds }),
    })
  }

  /**
   * Détacher des permissions d'un rôle
   */
  async detachRolePermissions(id: string | number, permissionIds: (string | number)[]): Promise<any> {
    return this.request(`/roles/${id}/permissions/detach`, {
      method: 'POST',
      body: JSON.stringify({ permissionIds }),
    })
  }

  /**
   * Récupérer la liste des permissions
   */
  async getPermissions(params?: {
    resource?: string
    action?: string
    documentTypeId?: string | number
  }): Promise<any[]> {
    const queryParams = new URLSearchParams()
    if (params?.resource) queryParams.append('resource', params.resource)
    if (params?.action) queryParams.append('action', params.action)
    if (params?.documentTypeId) queryParams.append('documentTypeId', params.documentTypeId.toString())

    const query = queryParams.toString()
    return this.request<any[]>(`/permissions${query ? `?${query}` : ''}`)
  }

  /**
   * Récupérer les permissions groupées par ressource
   */
  async getPermissionsByResource(): Promise<Record<string, any[]>> {
    return this.request<Record<string, any[]>>('/permissions/by-resource')
  }

  /**
   * Récupérer une permission par son ID
   */
  async getPermission(id: string | number): Promise<any> {
    return this.request<any>(`/permissions/${id}`)
  }

  /**
   * Créer une nouvelle permission
   */
  async createPermission(data: {
    name: string
    code: string
    description?: string
    resource?: string
    action: string
    documentTypeId?: string | number
  }): Promise<any> {
    return this.request('/permissions', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * Mettre à jour une permission
   */
  async updatePermission(id: string | number, data: {
    name?: string
    description?: string
    resource?: string
    action?: string
    documentTypeId?: string | number
  }): Promise<any> {
    return this.request(`/permissions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  /**
   * Supprimer une permission
   */
  async deletePermission(id: string | number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/permissions/${id}`, {
      method: 'DELETE',
    })
  }

  /**
   * Créer un utilisateur
   */
  async createUser(data: {
    email: string
    password: string
    fullName?: string
    role?: string
    roleIds?: (string | number)[]
  }): Promise<User> {
    return this.request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // ==================== CHAMPS DE DOCUMENT ====================

  /**
   * Récupérer tous les champs d'un type de document
   */
  async getDocumentFields(documentTypeId: string | number): Promise<DocumentField[]> {
    const fields = await this.request<DocumentField[]>(`/document-types/${documentTypeId}/fields`)
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
   * Créer un nouveau champ pour un type de document
   */
  async createDocumentField(documentTypeId: string | number, data: Partial<DocumentField>): Promise<DocumentField> {
    return this.request<DocumentField>(`/document-types/${documentTypeId}/fields`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * Mettre à jour un champ
   */
  async updateDocumentField(
    documentTypeId: string | number,
    fieldId: string | number,
    data: Partial<DocumentField>
  ): Promise<DocumentField> {
    return this.request<DocumentField>(`/document-types/${documentTypeId}/fields/${fieldId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  /**
   * Supprimer un champ
   */
  async deleteDocumentField(documentTypeId: string | number, fieldId: string | number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/document-types/${documentTypeId}/fields/${fieldId}`, {
      method: 'DELETE',
    })
  }

  // ==================== GROUPES DE CHAMPS ====================

  /**
   * Récupérer tous les groupes de champs d'un type de document
   */
  async getDocumentFieldGroups(documentTypeId: string | number): Promise<DocumentFieldGroup[]> {
    const groups = await this.request<DocumentFieldGroup[]>(`/document-types/${documentTypeId}/field-groups`)
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
  async getDocumentFieldGroup(documentTypeId: string | number, groupId: string | number): Promise<DocumentFieldGroup> {
    return this.request<DocumentFieldGroup>(`/document-types/${documentTypeId}/field-groups/${groupId}`)
  }

  /**
   * Créer un nouveau groupe de champs
   */
  async createDocumentFieldGroup(documentTypeId: string | number, data: Partial<DocumentFieldGroup>): Promise<DocumentFieldGroup> {
    return this.request<DocumentFieldGroup>(`/document-types/${documentTypeId}/field-groups`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * Mettre à jour un groupe de champs
   */
  async updateDocumentFieldGroup(
    documentTypeId: string | number,
    groupId: string | number,
    data: Partial<DocumentFieldGroup>
  ): Promise<DocumentFieldGroup> {
    return this.request<DocumentFieldGroup>(`/document-types/${documentTypeId}/field-groups/${groupId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  /**
   * Supprimer un groupe de champs
   */
  async deleteDocumentFieldGroup(documentTypeId: string | number, groupId: string | number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/document-types/${documentTypeId}/field-groups/${groupId}`, {
      method: 'DELETE',
    })
  }

  // ==================== SIGNATURES ====================

  /**
   * Récupérer les signatures de l'utilisateur connecté
   */
  async getSignatures(): Promise<{
    signatures: Array<{
      id: string
      signatureType: 'digital' | 'visual'
      signatureData?: string
      isDefault: boolean
      isActive: boolean
      createdAt: string
    }>
  }> {
    return this.request('/signatures')
  }

  /**
   * Met à jour une signature (notamment pour définir comme signature par défaut)
   */
  async updateSignature(signatureId: string, data: { isDefault?: boolean }): Promise<{
    message: string
    signature: any
  }> {
    return this.request(`/signatures/${signatureId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  /**
   * Supprime une signature
   */
  async deleteSignature(signatureId: string): Promise<{
    message: string
  }> {
    return this.request(`/signatures/${signatureId}`, {
      method: 'DELETE',
    })
  }

  /**
   * Créer une signature visuelle (depuis une image/données)
   */
  async createVisualSignature(signatureData: string): Promise<{
    message: string
    signature: any
  }> {
    return this.request('/signatures/visual', {
      method: 'POST',
      body: JSON.stringify({ signatureData }),
    })
  }

  /**
   * Générer une signature visuelle à partir du nom de l'utilisateur
   * Génère côté frontend puis enregistre côté backend
   */
  async generateSignatureFromName(options?: {
    name?: string
    style?: 'cursive' | 'handwritten' | 'formal'
    width?: number
    height?: number
    fontSize?: number
    color?: string
  }): Promise<{
    message: string
    signature: any
    signatureDataUrl: string
  }> {
    // Générer la signature côté frontend
    const signatureDataUrl = this.generateSignatureFromNameClient(options || {})
    
    // Enregistrer côté backend
    return this.request('/signatures/generate-from-name', {
      method: 'POST',
      body: JSON.stringify({
        signatureDataUrl,
        name: options?.name,
      }),
    })
  }

  /**
   * Génère une signature visuelle côté client (frontend uniquement)
   */
  private generateSignatureFromNameClient(options: {
    name?: string
    style?: 'cursive' | 'handwritten' | 'formal'
    width?: number
    height?: number
    fontSize?: number
    color?: string
  }): string {
    const {
      name = '',
      style = 'cursive',
      width = 300,
      height = 100,
      fontSize = 32,
      color = '#000000',
    } = options

    // Créer un canvas virtuel pour générer la signature
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      throw new Error('Impossible de créer le contexte canvas')
    }

    // Configurer le style selon le type
    let finalFontFamily = 'Brush Script MT, Brush Script, cursive'
    let finalFontSize = fontSize
    let fontStyle = 'italic'

    switch (style) {
      case 'cursive':
        finalFontFamily = 'Brush Script MT, Brush Script, cursive'
        finalFontSize = fontSize
        fontStyle = 'italic'
        break
      case 'handwritten':
        finalFontFamily = 'Comic Sans MS, Marker Felt, cursive'
        finalFontSize = fontSize * 0.9
        fontStyle = 'normal'
        break
      case 'formal':
        finalFontFamily = 'Times New Roman, serif'
        finalFontSize = fontSize * 0.8
        fontStyle = 'italic'
        break
    }

    ctx.font = `${fontStyle} ${finalFontSize}px ${finalFontFamily}`
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // Ajouter une légère rotation pour un effet plus naturel
    ctx.save()
    ctx.translate(width / 2, height / 2)
    ctx.rotate((Math.random() * 0.1 - 0.05) * Math.PI)

    // Dessiner le nom
    const offsetX = (Math.random() * 4 - 2)
    const offsetY = (Math.random() * 4 - 2)
    ctx.fillText(name, offsetX, offsetY)

    // Pas de ligne sous la signature (demandé par l'utilisateur)
    ctx.restore()

    // Convertir en data URL
    return canvas.toDataURL('image/png')
  }

  /**
   * Créer une signature depuis un pad tactile
   * Génère côté frontend puis enregistre côté backend
   */
  async createSignatureFromPad(signatureData: Array<{
    x: number
    y: number
    pressure?: number
    timestamp?: number
  }>, options?: {
    width?: number
    height?: number
    color?: string
    lineWidth?: number
  }): Promise<{
    message: string
    signature: any
    signatureDataUrl: string
  }> {
    // Générer la signature côté frontend
    const signatureDataUrl = this.generateSignatureFromPadClient(signatureData, options || {})
    
    // Enregistrer côté backend
    return this.request('/signatures/pad', {
      method: 'POST',
      body: JSON.stringify({
        signatureDataUrl,
      }),
    })
  }

  /**
   * Génère une signature depuis un pad côté client (frontend uniquement)
   */
  private generateSignatureFromPadClient(
    signatureData: Array<{ x: number; y: number; pressure?: number; timestamp?: number }>,
    options: {
      width?: number
      height?: number
      color?: string
      lineWidth?: number
    }
  ): string {
    const {
      width = 300,
      height = 100,
      color = '#000000',
      lineWidth = 2
    } = options

    if (!signatureData || signatureData.length === 0) {
      throw new Error('Les données de signature sont requises')
    }

    // Trouver les limites des données
    const minX = Math.min(...signatureData.map(p => p.x))
    const maxX = Math.max(...signatureData.map(p => p.x))
    const minY = Math.min(...signatureData.map(p => p.y))
    const maxY = Math.max(...signatureData.map(p => p.y))

    const dataWidth = maxX - minX || width
    const dataHeight = maxY - minY || height

    // Calculer le facteur d'échelle
    const scaleX = (width * 0.9) / dataWidth
    const scaleY = (height * 0.9) / dataHeight
    const scale = Math.min(scaleX, scaleY)

    // Calculer le décalage pour centrer
    const offsetX = (width - dataWidth * scale) / 2 - minX * scale
    const offsetY = (height - dataHeight * scale) / 2 - minY * scale

    // Créer le canvas
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      throw new Error('Impossible de créer le contexte canvas')
    }

    // Dessiner les traits
    ctx.strokeStyle = color
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    let currentPath: Array<{ x: number; y: number }> = []

    for (let i = 0; i < signatureData.length; i++) {
      const point = signatureData[i]
      const x = point.x * scale + offsetX
      const y = point.y * scale + offsetY

      const pressure = point.pressure || 1
      ctx.lineWidth = lineWidth * pressure

      if (i === 0 || (point.timestamp && i > 0 && (point.timestamp - (signatureData[i - 1].timestamp || 0)) > 100)) {
        // Nouveau trait
        if (currentPath.length > 1) {
          ctx.beginPath()
          ctx.moveTo(currentPath[0].x, currentPath[0].y)
          for (let j = 1; j < currentPath.length; j++) {
            ctx.lineTo(currentPath[j].x, currentPath[j].y)
          }
          ctx.stroke()
        }
        currentPath = [{ x, y }]
      } else {
        currentPath.push({ x, y })
      }
    }

    // Dessiner le dernier trait
    if (currentPath.length > 1) {
      ctx.beginPath()
      ctx.moveTo(currentPath[0].x, currentPath[0].y)
      for (let j = 1; j < currentPath.length; j++) {
        ctx.lineTo(currentPath[j].x, currentPath[j].y)
      }
      ctx.stroke()
    }

    // Convertir en data URL
    return canvas.toDataURL('image/png')
  }

  /**
   * Créer une signature numérique
   */
  async createDigitalSignature(options?: {
    algorithm?: 'RSA' | 'ECDSA' | 'EDDSA'
    hashAlgorithm?: 'sha256' | 'sha384' | 'sha512'
    keySize?: number
    curve?: 'P-256' | 'P-384' | 'P-521'
  }): Promise<{
    message: string
    signature: any
  }> {
    return this.request('/signatures/digital', {
      method: 'POST',
      body: JSON.stringify(options || {}),
    })
  }
}

// Export d'une instance unique du client API
export const api = new ApiClient()
export default api

