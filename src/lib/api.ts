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
  qrCode?: string | null // Data URL du QR code
  qrCodeUrl?: string | null // URL publique de l'image du QR code
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
  type: 'text' | 'number' | 'date' | 'datetime' | 'time' | 'select' | 'checkbox' | 'yesno' | 'textarea' | 'file' | 'image' | 'image_multiple' | 'document_link'
  required: boolean
  validationRules?: string | any | null
  options?: string | any | null // JSON string pour select, yesno, image, image_multiple
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

export interface DocumentWorkflow {
  id: string
  documentTypeId: string
  order: number
  roleRequired: string | null
  action: 'validate' | 'sign' | 'approve' | 'review'
  isMandatory: boolean
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

/**
 * Interface pour un modèle de template PDF (modèle de base de données)
 */
export interface PDFTemplateModel {
  id: string
  documentTypeId: string
  name: string
  description: string | null
  isDefault: boolean
  isActive: boolean
  templateData: PDFTemplate | string
  createdBy: string
  createdAt?: string
  updatedAt?: string
  documentType?: DocumentType
  creator?: User
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
    options: RequestInit = {},
    isJson: boolean = true
  ): Promise<T> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

    const headersInit: HeadersInit = new Headers(options.headers)
    
    // Ne pas définir Content-Type pour FormData (le navigateur le fera automatiquement)
    if (isJson && !(options.body instanceof FormData)) {
      headersInit.set('Content-Type', 'application/json')
    }

    if (token) {
      headersInit.set('Authorization', `Bearer ${token}`)
    }

    const url = `${this.baseURL}${endpoint}`
    
    // Convertir le body en JSON si c'est un objet et que isJson est true
    let body = options.body
    if (isJson && body && typeof body === 'object' && !(body instanceof FormData)) {
      body = JSON.stringify(body)
    }
    
    // Log pour les requêtes PUT vers /roles
    if (endpoint.includes('/roles/') && options.method === 'PUT') {
      console.log('[API.request] Envoi de la requête PUT vers:', url)
      console.log('[API.request] Options:', {
        method: options.method,
        body: body,
        headers: Object.fromEntries(headersInit.entries()),
      })
    }
    
    try {
      const response = await fetch(url, {
        ...options,
        body: body,
        headers: headersInit,
      })
      
      // Log pour les réponses PUT vers /roles
      if (endpoint.includes('/roles/') && options.method === 'PUT') {
        console.log('[API.request] Réponse reçue:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
        })
      }

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
   * Mettre à jour le profil de l'utilisateur connecté
   */
  async updateProfile(data: {
    fullName?: string
  }): Promise<User> {
    return this.request<User>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  /**
   * Changer le mot de passe de l'utilisateur connecté
   */
  async changePassword(data: {
    currentPassword: string
    newPassword: string
  }): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    })
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
    status?: string | string[]
    documentTypeId?: string | number | (string | number)[]
    dateFrom?: string
    dateTo?: string
    search?: string
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
    
    // Support pour status multiple (array) ou unique (string)
    if (params?.status) {
      if (Array.isArray(params.status)) {
        params.status.forEach(s => queryParams.append('status[]', s))
      } else {
        queryParams.append('status', params.status)
      }
    }
    
    // Support pour documentTypeId multiple (array) ou unique (string/number)
    if (params?.documentTypeId) {
      if (Array.isArray(params.documentTypeId)) {
        params.documentTypeId.forEach(id => queryParams.append('documentTypeId[]', id.toString()))
      } else {
        queryParams.append('documentTypeId', params.documentTypeId.toString())
      }
    }
    
    if (params?.dateFrom) queryParams.append('dateFrom', params.dateFrom)
    if (params?.dateTo) queryParams.append('dateTo', params.dateTo)
    if (params?.search) queryParams.append('search', params.search)

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
   * Récupérer les documents en attente de signature pour l'utilisateur connecté
   */
  async getPendingSignatures(): Promise<{
    documents: Array<{
      id: string
      documentNumber: string
      documentType: {
        id: string
        name: string
      } | null
      status: string
      createdAt: string
      creator: {
        id: string
        fullName: string
      } | null
      lastSigner: {
        id: string
        fullName: string
        signedAt: string
      } | null
      totalSigners: number
      signedCount: number
    }>
    count: number
  }> {
    return this.request('/documents/pending-signatures')
  }

  /**
   * Récupérer les documents signés par l'utilisateur connecté
   */
  async getSignedDocuments(params?: {
    page?: number
    limit?: number
  }): Promise<{
    data: Array<{
      id: string
      documentNumber: string
      documentType: {
        id: string
        name: string
      } | null
      status: string
      createdAt: string
      signedAt: string | null
      creator: {
        id: string
        fullName: string
      } | null
      lastSigner: {
        id: string
        fullName: string
        signedAt: string
      } | null
      totalSigners: number
      signedCount: number
    }>
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
    const query = queryParams.toString()
    return this.request(`/documents/signed${query ? `?${query}` : ''}`)
  }

  /**
   * Récupérer les documents rejetés où l'utilisateur est impliqué
   */
  async getRejectedDocuments(params?: {
    page?: number
    limit?: number
  }): Promise<{
    data: Array<{
      id: string
      documentNumber: string
      documentType: {
        id: string
        name: string
      } | null
      status: string
      createdAt: string
      creator: {
        id: string
        fullName: string
      } | null
      lastSigner: {
        id: string
        fullName: string
        signedAt: string
      } | null
      totalSigners: number
      signedCount: number
    }>
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
    const query = queryParams.toString()
    return this.request(`/documents/rejected${query ? `?${query}` : ''}`)
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

  /**
   * Importer un type de document depuis un fichier JSON
   */
  async importDocumentType(importData: any): Promise<DocumentType> {
    return this.request<DocumentType>('/document-types/import', {
      method: 'POST',
      body: JSON.stringify(importData),
    })
  }

  // ==================== TEMPLATES PDF ====================

  /**
   * Récupérer tous les templates d'un type de document
   */
  async getTemplates(documentTypeId: string | number): Promise<PDFTemplateModel[]> {
    const templates = await this.request<PDFTemplateModel[]>(`/document-types/${documentTypeId}/pdf-templates`)
    // Parser templateData si c'est une string
    return templates.map(t => ({
      ...t,
      templateData: typeof t.templateData === 'string' ? JSON.parse(t.templateData) : t.templateData
    }))
  }

  /**
   * Récupérer tous les templates par défaut du système
   */
  async getDefaultTemplates(): Promise<PDFTemplateModel[]> {
    const templates = await this.request<PDFTemplateModel[]>(`/pdf-templates/defaults`)
    // Parser templateData si c'est une string
    return templates.map(t => ({
      ...t,
      templateData: typeof t.templateData === 'string' ? JSON.parse(t.templateData) : t.templateData
    }))
  }

  /**
   * Récupérer le template actif d'un type de document (ou un template spécifique)
   */
  async getTemplate(documentTypeId: string | number, templateId?: string | number): Promise<PDFTemplate> {
    const query = templateId ? `?templateId=${templateId}` : ''
    return this.request<PDFTemplate>(`/document-types/${documentTypeId}/pdf-template${query}`)
  }

  /**
   * Sauvegarder le template PDF d'un type de document (crée ou met à jour)
   */
  async saveTemplate(documentTypeId: string | number, template: PDFTemplate & { id?: string }): Promise<{
    message: string
    template: PDFTemplateModel
  }> {
    return this.request(`/document-types/${documentTypeId}/pdf-template`, {
      method: 'POST',
      body: JSON.stringify(template),
    })
  }

  /**
   * Activer un template (et désactiver les autres)
   */
  async activateTemplate(documentTypeId: string | number, templateId: string | number): Promise<{
    message: string
  }> {
    return this.request(`/document-types/${documentTypeId}/pdf-template/${templateId}/activate`, {
      method: 'POST',
    })
  }

  /**
   * Lier un template existant à un DocumentType
   */
  async linkTemplate(documentTypeId: string | number, templateId: string | number, activate: boolean = false): Promise<{
    message: string
    template: PDFTemplateModel
  }> {
    return this.request(`/document-types/${documentTypeId}/pdf-template/link`, {
      method: 'POST',
      body: JSON.stringify({ templateId, activate }),
    })
  }

  /**
   * Supprimer un template
   */
  async deleteTemplate(documentTypeId: string | number, templateId: string | number): Promise<{
    message: string
  }> {
    return this.request(`/document-types/${documentTypeId}/pdf-template/${templateId}`, {
      method: 'DELETE',
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
    console.log('[API.updateRole] Appel de updateRole:', {
      roleId: id,
      data,
      permissionIds: data.permissionIds,
      permissionIdsLength: data.permissionIds?.length,
    })
    
    const result = await this.request(`/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    
    console.log('[API.updateRole] Réponse reçue:', result)
    return result
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
   * Vérifier si l'utilisateur a une permission (via le backend)
   */
  async checkPermission(params: {
    permission?: string
    permissions?: string[]
    documentTypeId?: string
    requireAll?: boolean
  }): Promise<{ hasAccess: boolean; reason?: string }> {
    return this.request<{ hasAccess: boolean; reason?: string }>('/permissions/check', {
      method: 'POST',
      body: JSON.stringify(params),
    })
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

  // ==================== DOCUMENT WORKFLOWS ====================

  /**
   * Récupérer tous les workflows d'un type de document
   */
  async getDocumentWorkflows(documentTypeId: string | number): Promise<DocumentWorkflow[]> {
    return this.request<DocumentWorkflow[]>(`/document-types/${documentTypeId}/workflows`)
  }

  /**
   * Récupérer un workflow par son ID
   */
  async getDocumentWorkflow(documentTypeId: string | number, workflowId: string | number): Promise<DocumentWorkflow> {
    return this.request<DocumentWorkflow>(`/document-types/${documentTypeId}/workflows/${workflowId}`)
  }

  /**
   * Créer un nouveau workflow
   */
  async createDocumentWorkflow(documentTypeId: string | number, data: Partial<DocumentWorkflow>): Promise<DocumentWorkflow> {
    return this.request<DocumentWorkflow>(`/document-types/${documentTypeId}/workflows`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * Mettre à jour un workflow
   */
  async updateDocumentWorkflow(
    documentTypeId: string | number,
    workflowId: string | number,
    data: Partial<DocumentWorkflow>
  ): Promise<DocumentWorkflow> {
    return this.request<DocumentWorkflow>(`/document-types/${documentTypeId}/workflows/${workflowId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  /**
   * Supprimer un workflow
   */
  async deleteDocumentWorkflow(documentTypeId: string | number, workflowId: string | number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/document-types/${documentTypeId}/workflows/${workflowId}`, {
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

  // ==================== IMAGES UPLOAD ====================

  /**
   * Upload une seule image
   */
  async uploadImage(file: File): Promise<{ url: string }> {
    const formData = new FormData()
    formData.append('file', file)

    return this.request<{ url: string }>('/images/upload', {
      method: 'POST',
      body: formData,
    }, false) // Pas de JSON.stringify pour FormData
  }

  /**
   * Upload plusieurs images (pour image_multiple)
   */
  async uploadImages(files: File[]): Promise<{ urls: string[]; errors?: string[] }> {
    const formData = new FormData()
    files.forEach((file) => {
      formData.append('files', file)
    })

    return this.request<{ urls: string[]; errors?: string[] }>('/images/upload-multiple', {
      method: 'POST',
      body: formData,
    }, false) // Pas de JSON.stringify pour FormData
  }

  /**
   * Récupère les informations complètes d'un document via son QR code (publique, sans auth)
   */
  async getQRInfo(token: string): Promise<{
    valid: boolean
    document: {
      id: string
      documentNumber: string
      documentType: string
      documentTypeCode: string | null
      status: string
      createdAt: string
      createdBy: { id: string; name: string; email: string | null }
      expirationDate: string | null
      version: number
    }
    signature: {
      isSigned: boolean
      completionDate: string | null
      signatories: Array<{
        id: string
        name: string
        email: string | null
        role: string
        signedAt: string | null
        signatureMethod: string | null
        hasSigned: boolean
      }>
      signatureCount: number
      totalSignatories: number
    }
    qrCode: {
      token: string
      generatedAt: string
      expirationDate: string | null
      isValid: boolean
      isRevoked: boolean
      isUsed: boolean
    }
    verification: {
      verified: boolean
      timestamp: string
      integrity: string
    }
    linkInfo: {
      documentId: string
      documentNumber: string
      documentTypeCode: string | null
      canBeLinked: boolean
    }
  }> {
    // Route publique, pas besoin d'auth
    const response = await fetch(`${this.baseURL}/qr/${token}/info`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erreur lors de la récupération des informations du QR code')
    }

    return response.json()
  }

  // ==================== NOTIFICATIONS ====================

  /**
   * Récupérer toutes les notifications de l'utilisateur connecté
   */
  async getNotifications(params?: {
    page?: number
    limit?: number
    unread?: 'true' | 'false'
    type?: 'document' | 'document_type' | 'category' | 'user'
  }): Promise<{
    data: Notification[]
    meta: {
      total: number
      perPage: number
      currentPage: number
      lastPage: number
    }
  }> {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.unread) queryParams.append('unread', params.unread)
    if (params?.type) queryParams.append('type', params.type)

    const query = queryParams.toString()
    return this.request(`/notifications${query ? `?${query}` : ''}`)
  }

  /**
   * Récupérer une notification spécifique
   */
  async getNotification(id: string): Promise<Notification> {
    return this.request(`/notifications/${id}`)
  }

  /**
   * Compter les notifications non lues
   */
  async getUnreadNotificationsCount(): Promise<{ count: number }> {
    return this.request('/notifications/unread-count')
  }

  /**
   * Marquer une notification comme lue
   */
  async markNotificationAsRead(id: string): Promise<{ message: string; data: Notification }> {
    return this.request(`/notifications/${id}/read`, {
      method: 'PATCH',
    })
  }

  /**
   * Marquer toutes les notifications comme lues
   */
  async markAllNotificationsAsRead(): Promise<{ message: string }> {
    return this.request('/notifications/read-all', {
      method: 'PATCH',
    })
  }

  /**
   * Supprimer une notification
   */
  async deleteNotification(id: string): Promise<{ message: string }> {
    return this.request(`/notifications/${id}`, {
      method: 'DELETE',
    })
  }

  /**
   * Supprimer toutes les notifications lues
   */
  async deleteReadNotifications(): Promise<{ message: string }> {
    return this.request('/notifications/read/delete-all', {
      method: 'DELETE',
    })
  }

  // ==================== PUSH SUBSCRIPTIONS (Web Push Notifications) ====================

  /**
   * Obtenir la clé publique VAPID
   */
  async getVapidPublicKey(): Promise<{ publicKey: string }> {
    return this.request('/push/vapid-public-key')
  }

  /**
   * Récupérer toutes les subscriptions push de l'utilisateur connecté
   */
  async getPushSubscriptions(): Promise<{
    data: PushSubscription[]
    vapidPublicKey: string | null
  }> {
    return this.request('/push/subscriptions')
  }

  /**
   * Enregistrer une nouvelle subscription push
   */
  async subscribeToPush(data: {
    subscription: {
      endpoint: string
      keys: {
        p256dh: string
        auth: string
      }
    }
    userAgent?: string | null
    deviceInfo?: string | null
  }): Promise<{ message: string; data: PushSubscription }> {
    return this.request('/push/subscribe', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * Désactiver une subscription push
   */
  async unsubscribeFromPush(id: string): Promise<{ message: string; data: PushSubscription }> {
    return this.request(`/push/unsubscribe/${id}`, {
      method: 'POST',
    })
  }

  /**
   * Supprimer une subscription push
   */
  async deletePushSubscription(id: string): Promise<{ message: string }> {
    return this.request(`/push/subscriptions/${id}`, {
      method: 'DELETE',
    })
  }

  /**
   * Tester l'envoi d'une notification push
   */
  async testPushNotification(): Promise<{ message: string }> {
    return this.request('/push/test', {
      method: 'POST',
    })
  }

  // ==================== DASHBOARD ====================

  /**
   * Récupérer les statistiques du dashboard
   */
  async getDashboardStats(): Promise<DashboardStats> {
    return this.request<DashboardStats>('/dashboard/stats')
  }
}

export interface Notification {
  id: string
  userId: string
  type: 'document' | 'document_type' | 'category' | 'user'
  event: string
  title: string
  description: string
  isRead: boolean
  data: any | null
  link: string | null
  readAt: string | null
  createdAt: string
  updatedAt: string | null
}

export interface PushSubscription {
  id: string
  userId: string
  endpoint: string
  p256dh: string
  auth: string
  userAgent: string | null
  deviceInfo: string | null
  isActive: boolean
  expiresAt: string | null
  createdAt: string
  updatedAt: string | null
}

export interface DashboardStats {
  documents: {
    total: number
    pending: number
    approved: number
    rejected: number
    signed: number
    draft: number
    inProgress: number
    expired: number
    cancelled: number
  }
  documentsByType: Array<{
    documentTypeId: string
    documentTypeName: string
    documentTypeCode: string
    count: number
  }>
  documentsByStatus: Array<{
    status: string
    count: number
  }>
  recentDocuments: Array<{
    id: string
    documentNumber: string
    documentTypeName: string
    status: string
    createdAt: string
    createdByName: string
  }>
  activity: {
    today: number
    thisWeek: number
    thisMonth: number
  }
  pendingActions: {
    awaitingSignature: number
    awaitingApproval: number
    awaitingReview: number
  }
}

// Export d'une instance unique du client API
export const api = new ApiClient()
export default api

