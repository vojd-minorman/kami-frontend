# Documentation : Filtres Avancés et Infinite Scroll pour les Documents

## Vue d'ensemble

Cette documentation décrit l'implémentation des fonctionnalités de filtrage avancé et de chargement progressif (infinite scroll) pour la page de liste des documents. Ces améliorations permettent une meilleure expérience utilisateur avec des filtres multiples, une recherche serveur, et un chargement optimisé.

---

## 🎯 Fonctionnalités implémentées

### 1. Infinite Scroll (Chargement progressif)
- Chargement de 50 documents à la fois
- Détection automatique du scroll pour charger plus de documents
- Indicateur de chargement
- Message "Tous les documents chargés" en fin de liste

### 2. Filtres Avancés
- **Recherche textuelle** : Par numéro, créateur, type de document
- **Sélection multiple de statuts** : Permet de filtrer par plusieurs statuts simultanément
- **Sélection multiple de types de documents** : Permet de filtrer par plusieurs types simultanément
- **Plage de dates** : Filtre par date de création (Du / Au)
- **Badge de filtres actifs** : Affiche un résumé des filtres appliqués
- **Bouton de réinitialisation** : Réinitialise tous les filtres d'un coup

### 3. Responsive Design
- Layout adaptatif pour mobile, tablette et desktop
- Filtres qui passent à la ligne automatiquement
- Tableau avec scroll horizontal sur mobile
- Affichage optimisé des informations selon la taille d'écran

---

## 📁 Fichiers modifiés/créés

### Frontend

#### Composants créés
1. **`src/components/ui/multi-select.tsx`**
   - Composant de sélection multiple avec badges
   - Support des options multiples avec affichage compact
   - Popover avec recherche visuelle

2. **`src/components/ui/popover.tsx`**
   - Composant Popover basé sur Radix UI
   - Utilisé par le MultiSelect

3. **`src/components/date-range-picker.tsx`**
   - Composant de sélection de plage de dates
   - Deux inputs date (Du / Au) avec bouton de réinitialisation

#### Fichiers modifiés
1. **`src/app/dashboard/vouchers/page.tsx`**
   - Refactorisation complète avec infinite scroll
   - Intégration des filtres avancés
   - Amélioration de la responsivité

2. **`src/lib/api.ts`**
   - Mise à jour de `getDocuments()` pour supporter les nouveaux paramètres

### Backend

#### Fichiers modifiés
1. **`app/controllers/document_controller.ts`**
   - Méthode `index()` refactorisée
   - Support des filtres multiples (arrays)
   - Support des dates (dateFrom, dateTo)
   - Recherche textuelle avec sous-requêtes
   - Tri par date décroissante par défaut
   - Limite augmentée à 50 documents par page

---

## 🔧 Détails techniques

### Backend : Filtres multiples

#### Gestion des paramètres multiples

Le backend utilise `request.qs()` pour récupérer les paramètres de requête et supporte plusieurs formats :

```typescript
// Format avec [] : status[]=DRAFT&status[]=SIGNED
// Format CSV : status=DRAFT,SIGNED
// Format simple : status=DRAFT
```

**Exemple de code :**
```typescript
const qs = request.qs()
let statusParam: any = qs.status || qs['status[]']

if (Array.isArray(statusParam)) {
  statusParam = statusParam
} else if (typeof statusParam === 'string' && statusParam.includes(',')) {
  statusParam = statusParam.split(',').map((s: string) => s.trim()).filter(Boolean)
} else if (typeof statusParam === 'string') {
  statusParam = [statusParam]
}
```

#### Filtrage par statuts multiples

```typescript
if (statusParam && Array.isArray(statusParam) && statusParam.length > 0) {
  const validStatuses = statusParam
    .filter((s: any) => s && s !== 'all' && typeof s === 'string')
    .map((s: string) => s.toUpperCase())
  
  if (validStatuses.length > 0) {
    query.whereIn('status', validStatuses)
  }
}
```

#### Filtrage par types de documents multiples

```typescript
if (documentTypeIdParam && Array.isArray(documentTypeIdParam) && documentTypeIdParam.length > 0) {
  const documentTypeIds = documentTypeIdParam
    .filter((id: any) => id !== null && id !== undefined)
    .map((id: any) => String(id))
  
  if (documentTypeIds.length > 0) {
    query.whereIn('documentTypeId', documentTypeIds)
    // Vérification des permissions...
  }
}
```

#### Filtrage par plage de dates

```typescript
if (dateFrom) {
  const fromDate = new Date(dateFrom)
  query.where('createdAt', '>=', fromDate.toISOString())
}

if (dateTo) {
  const toDate = new Date(dateTo)
  toDate.setHours(23, 59, 59, 999)
  query.where('createdAt', '<=', toDate.toISOString())
}
```

#### Recherche textuelle

La recherche utilise des sous-requêtes `whereExists` pour chercher dans les relations :

```typescript
if (search && typeof search === 'string' && search.trim().length > 0) {
  const searchTerm = `%${search.trim()}%`
  
  query.where((subQuery) => {
    subQuery
      .whereILike('document_number', searchTerm)
      .orWhereExists((innerQuery) => {
        innerQuery
          .from('users')
          .whereColumn('users.id', 'documents.created_by')
          .where((userQuery) => {
            userQuery
              .whereILike('users.full_name', searchTerm)
              .orWhereILike('users.email', searchTerm)
          })
      })
      .orWhereExists((innerQuery) => {
        innerQuery
          .from('document_types')
          .whereColumn('document_types.id', 'documents.document_type_id')
          .whereILike('document_types.name', searchTerm)
      })
  })
}
```

**⚠️ Important :** Utiliser les noms de colonnes réels en snake_case (`document_number`, `created_by`, `document_type_id`) dans les sous-requêtes SQL, même si le modèle utilise camelCase.

---

### Frontend : Infinite Scroll

#### Principe

L'infinite scroll utilise l'API `IntersectionObserver` pour détecter quand l'utilisateur approche de la fin de la liste.

**État de gestion :**
```typescript
const [documents, setDocuments] = useState<Document[]>([])
const [currentPage, setCurrentPage] = useState(1)
const [hasMore, setHasMore] = useState(true)
const [loadingMore, setLoadingMore] = useState(false)
const observerTarget = useRef<HTMLDivElement>(null)
const limit = 50
```

#### Implémentation

```typescript
// Fonction de chargement avec support append
const loadDocuments = useCallback(async (page: number = 1, append: boolean = false) => {
  try {
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
      setDocuments([]) // Réinitialiser lors d'une nouvelle recherche
    }
    
    const params: any = {
      page,
      limit: 50,
      // ... autres filtres
    }
    
    const response = await api.getDocuments(params)
    
    if (append) {
      setDocuments(prev => [...prev, ...response.data])
    } else {
      setDocuments(response.data)
    }
    
    setTotal(response.meta.total)
    setHasMore(response.data.length === limit && response.meta.currentPage < response.meta.lastPage)
    setCurrentPage(page)
  } catch (error) {
    console.error('Error loading documents:', error)
  } finally {
    setLoading(false)
    setLoadingMore(false)
  }
}, [/* dépendances des filtres */])

// Observer pour infinite scroll
useEffect(() => {
  if (!observerTarget.current || !hasMore || loading || loadingMore) return

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && hasMore && !loadingMore) {
        loadDocuments(currentPage + 1, true)
      }
    },
    { threshold: 0.1 }
  )

  observer.observe(observerTarget.current)

  return () => {
    if (observerTarget.current) {
      observer.unobserve(observerTarget.current)
    }
  }
}, [hasMore, loading, loadingMore, currentPage, loadDocuments])
```

#### Élément déclencheur dans le JSX

```tsx
<div ref={observerTarget} className="h-10 flex items-center justify-center mt-4">
  {loadingMore && (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      Chargement de plus de documents...
    </div>
  )}
  {!hasMore && documents.length > 0 && (
    <p className="text-sm text-muted-foreground">
      Tous les documents ont été chargés
    </p>
  )}
</div>
```

---

### Frontend : Composant MultiSelect

#### Utilisation

```tsx
import { MultiSelect } from '@/components/ui/multi-select'

const options = [
  { label: 'Brouillon', value: 'DRAFT' },
  { label: 'Signé', value: 'SIGNED' },
  // ...
]

const [selected, setSelected] = useState<(string | number)[]>([])

<MultiSelect
  options={options}
  selected={selected}
  onChange={setSelected}
  placeholder="Tous les statuts"
  className="w-full"
  maxCount={2} // Nombre max de badges à afficher avant "+X autre(s)"
/>
```

#### Props

| Prop | Type | Description | Défaut |
|------|------|-------------|--------|
| `options` | `MultiSelectOption[]` | Liste des options disponibles | Requis |
| `selected` | `(string \| number)[]` | Valeurs sélectionnées | Requis |
| `onChange` | `(selected: (string \| number)[]) => void` | Callback lors du changement | Requis |
| `placeholder` | `string` | Texte affiché quand rien n'est sélectionné | `"Sélectionner..."` |
| `className` | `string` | Classes CSS supplémentaires | - |
| `maxCount` | `number` | Nombre max de badges visibles | `2` |

#### Interface

```typescript
interface MultiSelectOption {
  label: string
  value: string | number
}
```

---

### Frontend : Composant DateRangePicker

#### Utilisation

```tsx
import { DateRangePicker } from '@/components/date-range-picker'

const [dateFrom, setDateFrom] = useState<string | undefined>()
const [dateTo, setDateTo] = useState<string | undefined>()

<DateRangePicker
  dateFrom={dateFrom}
  dateTo={dateTo}
  onDateFromChange={setDateFrom}
  onDateToChange={setDateTo}
  className="w-full"
/>
```

#### Props

| Prop | Type | Description |
|------|------|-------------|
| `dateFrom` | `string \| undefined` | Date de début (format ISO: YYYY-MM-DD) |
| `dateTo` | `string \| undefined` | Date de fin (format ISO: YYYY-MM-DD) |
| `onDateFromChange` | `(date: string \| undefined) => void` | Callback pour date de début |
| `onDateToChange` | `(date: string \| undefined) => void` | Callback pour date de fin |
| `className` | `string` | Classes CSS supplémentaires |

#### Caractéristiques

- Deux inputs de type `date` côte à côte
- Bouton de réinitialisation (X) visible uniquement si une date est sélectionnée
- Validation : `dateTo` ne peut pas être antérieure à `dateFrom` (via attribut `min`)
- Icône calendrier dans chaque input

---

## 🎨 Layout Responsive

### Grille des filtres

Utilisation de `flex-wrap` pour permettre le passage à la ligne automatique :

```tsx
<div className="flex flex-wrap gap-4">
  <div className="space-y-2 min-w-[200px] flex-1 basis-full sm:basis-[calc(50%-0.5rem)] lg:basis-[calc(33.333%-0.67rem)] xl:basis-auto">
    {/* Filtre */}
  </div>
</div>
```

**Breakpoints :**
- Mobile (< 640px) : `basis-full` (100% largeur)
- Tablet (≥ 640px) : `basis-[calc(50%-0.5rem)]` (2 colonnes)
- Desktop (≥ 1024px) : `basis-[calc(33.333%-0.67rem)]` (3 colonnes)
- XL (≥ 1280px) : `basis-auto` (largeur selon contenu, passage à la ligne si nécessaire)

### Tableau responsive

```tsx
<div className="overflow-x-auto -mx-4 sm:mx-0">
  <div className="inline-block min-w-full align-middle px-4 sm:px-0">
    <Table>
      {/* Colonnes avec min-width responsive */}
      <TableHead className="min-w-[100px] sm:min-w-[120px]">Numéro</TableHead>
      {/* ... */}
    </Table>
  </div>
</div>
```

**Stratégies :**
- Scroll horizontal sur mobile (`-mx-4` pour étendre jusqu'aux bords)
- Colonnes cachées sur mobile avec affichage alternatif (`hidden sm:table-cell`)
- Textes plus petits sur mobile (`text-xs sm:text-sm`)
- Badges compacts sur mobile

---

## 📡 API : Mise à jour getDocuments

### Signature mise à jour

```typescript
async getDocuments(params?: {
  page?: number
  limit?: number
  status?: string | string[]  // Support multiple
  documentTypeId?: string | number | (string | number)[]  // Support multiple
  dateFrom?: string  // Format ISO: YYYY-MM-DD
  dateTo?: string    // Format ISO: YYYY-MM-DD
  search?: string    // Recherche textuelle
}): Promise<{
  data: Document[]
  meta: {
    total: number
    perPage: number
    currentPage: number
    lastPage: number
    firstPage: number
  }
}>
```

### Exemple d'utilisation

```typescript
// Recherche simple
const response = await api.getDocuments({
  page: 1,
  limit: 50,
  status: 'DRAFT'
})

// Filtres multiples
const response = await api.getDocuments({
  page: 1,
  limit: 50,
  status: ['DRAFT', 'SIGNED', 'ACTIVE'],
  documentTypeId: ['type-id-1', 'type-id-2'],
  dateFrom: '2024-01-01',
  dateTo: '2024-12-31',
  search: 'document-001'
})
```

---

## 🔄 Gestion des événements WebSocket

Les événements WebSocket sont toujours supportés pour la mise à jour en temps réel :

```typescript
useEffect(() => {
  if (!user) return

  const handleDocumentCreated = (event: CustomEvent) => {
    // Recharger si on est sur la première page sans filtres
    if (currentPage === 1 && selectedStatuses.length === 0 && !searchQuery) {
      loadDocuments(1, false)
    }
  }

  const handleDocumentSigned = (event: CustomEvent) => {
    // Mettre à jour le document dans la liste
    setDocuments(prev => prev.map(doc => 
      doc.id === signedData.documentId 
        ? { ...doc, status: signedData.status }
        : doc
    ))
  }

  // Écouter les événements
  window.addEventListener('document:created', handleDocumentCreated as EventListener)
  window.addEventListener('document:signed', handleDocumentSigned as EventListener)
  // ...

  return () => {
    // Cleanup
  }
}, [user, currentPage, selectedStatuses, searchQuery, loadDocuments])
```

---

## ✅ Bonnes pratiques

### Backend

1. **Noms de colonnes** : Toujours utiliser snake_case dans les sous-requêtes SQL (`document_number`, `created_by`)
2. **Validation** : Valider et normaliser les paramètres multiples avant utilisation
3. **Permissions** : Vérifier les permissions pour chaque type de document sélectionné
4. **Performance** : Utiliser `whereIn` pour les filtres multiples au lieu de multiples `where`

### Frontend

1. **Debounce** : Utiliser debounce pour la recherche textuelle (500ms)
2. **État de chargement** : Distinguer `loading` (chargement initial) et `loadingMore` (chargement suivant)
3. **Réinitialisation** : Réinitialiser la liste (`setDocuments([])`) lors d'un nouveau filtre
4. **Observer cleanup** : Toujours nettoyer l'observer dans le cleanup du useEffect
5. **Responsive** : Toujours tester sur différentes tailles d'écran

### Performance

1. **Limite raisonnable** : 50 documents par page est un bon compromis
2. **Lazy loading** : Ne charger que quand nécessaire (infinite scroll)
3. **Memoization** : Utiliser `useCallback` pour les fonctions de chargement
4. **Éviter les re-renders** : Utiliser les dépendances appropriées dans les useEffect

---

## 🐛 Dépannage

### Problème : Les filtres multiples ne fonctionnent pas

**Solution :** Vérifier que le backend utilise `request.qs()` et gère correctement les arrays :
```typescript
const qs = request.qs()
let statusParam = qs.status || qs['status[]']
// Normaliser en array...
```

### Problème : Erreur SQL "colonne n'existe pas"

**Solution :** Utiliser les noms de colonnes réels en snake_case dans les sous-requêtes :
```typescript
// ❌ Mauvais
.whereColumn('users.id', 'documents.createdBy')

// ✅ Bon
.whereColumn('users.id', 'documents.created_by')
```

### Problème : Infinite scroll ne se déclenche pas

**Vérifications :**
1. L'élément `observerTarget` est bien visible dans le DOM
2. `hasMore` est `true`
3. `loading` et `loadingMore` sont `false`
4. Le threshold de l'observer est approprié (0.1 = 10%)

### Problème : Filtres qui ne se réinitialisent pas

**Solution :** S'assurer que le `useEffect` qui appelle `loadDocuments` dépend bien de tous les filtres :
```typescript
useEffect(() => {
  loadDocuments(1, false)
}, [selectedStatuses, selectedDocumentTypes, dateFrom, dateTo, searchQuery])
```

---

## 📝 Notes importantes

1. **Tri par défaut** : Les documents sont triés par `createdAt DESC` (plus récent en premier)
2. **Colonne Initiateur** : La colonne "Site" a été remplacée par "Initiateur" (nom du créateur)
3. **Format de date** : Utiliser le format ISO (YYYY-MM-DD) pour les dates
4. **Pagination** : L'infinite scroll remplace la pagination classique
5. **Limite** : 50 documents par page (configurable via la constante `limit`)

---

## 🚀 Améliorations futures possibles

1. **Export des résultats filtrés** : Ajouter un bouton pour exporter les documents filtrés
2. **Sauvegarde des filtres** : Sauvegarder les filtres préférés dans le localStorage
3. **Filtres avancés supplémentaires** : Par créateur, par plage de dates de signature, etc.
4. **Tri personnalisable** : Permettre à l'utilisateur de choisir l'ordre de tri
5. **Vue alternative** : Ajouter une vue en grille/cartes en plus du tableau

---

## 📚 Références

- [Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
- [Radix UI Popover](https://www.radix-ui.com/primitives/docs/components/popover)
- [AdonisJS Query Builder](https://docs.adonisjs.com/guides/database/query-builder)
- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)

---

**Dernière mise à jour :** 2024
**Version :** 1.0
