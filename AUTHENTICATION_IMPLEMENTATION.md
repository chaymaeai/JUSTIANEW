# Documentation d'implémentation - Authentification Justia

## Vue d'ensemble

L'authentification Justia est architecturée avec trois espaces distincts :
1. **Espace Client** - Pour les clients (personnes physiques/morales)
2. **Espace Expert** - Pour les experts (qui interviennent sur les dossiers)
3. **Espace Admin** - Pour l'administration (gestion des experts, clients, rapports)

## Architecture

### Modèle de données (Backend)

**User Model** (`justia_backend/apps/authentication/models.py`)

```python
Rôles disponibles:
- "client" : Client inscrit
- "expert" : Expert interne (intervient sur les dossiers)
- "admin"  : Administrateur (gère la plateforme)

Types de profil client:
- "physique" : Personne physique
- "morale"   : Personne morale (entreprise)
```

### Flux d'authentification

#### 1. Inscription Client

**Endpoint:** `POST /auth/register/`

**Flux:**
- L'utilisateur choisit son type de compte (particulier/entreprise)
- Remplit ses informations personnelles
- Crée un mot de passe
- Un email de vérification est envoyé
- Après vérification, le compte devient actif

**Validation:**
- Email unique
- Mot de passe minimum 8 caractères
- Par type de profil:
  - **Physique:** prénom et nom obligatoires
  - **Morale:** raison sociale obligatoire

#### 2. Connexion Client

**Endpoint:** `POST /auth/login/`

**Flux:**
1. Utilisateur saisit email et mot de passe
2. Validation des identifiants
3. Vérification:
   - Compte actif (is_active=true)
   - Email vérifié (is_verified=true)
4. Génération JWT (access + refresh)
5. Redirection vers `/espace-client/dashboard`

**Permissions:** AcceptAny

#### 3. Connexion Expert/Admin

**Endpoint:** `POST /auth/staff/login/`

**Flux:**
1. Expert/Admin saisit email et mot de passe
2. Validation des identifiants
3. Vérification:
   - Compte actif (is_active=true)
   - Rôle = "expert" OU "admin" (refuse "client")
4. Génération JWT
5. Redirection selon rôle:
   - Admin → `/admin/dashboard`
   - Expert → `/fournisseur/dashboard`

**Permissions:** AcceptAny

#### 4. Création d'Expert par Admin

**Endpoint:** `POST /auth/staff/experts/create/`

**Flux:**
1. Admin accède à `/admin/experts`
2. Remplit formulaire de création
3. Backend crée utilisateur avec:
   - `role="expert"`
   - `is_verified=true`
   - `is_staff=true`

**Permissions:** IsAuthenticated + IsAdminOnly

### Permissions & Autorisations

#### Backend Permissions (`apps/core/permissions.py`)

```python
IsClient       : Accès réservé aux clients
IsExpert       : Accès réservé aux experts
IsAdmin        : Accès réservé aux admins
IsExpertOrAdmin: Accès aux experts et admins (personnel interne)
```

#### Frontend Protection

**ProtectedRoute** (`src/components/auth/ProtectedRoute.tsx`)

```typescript
- allowedRoles: UserRole[] - Filtrage par rôle
- Redirection automatique si non authentifié
- Redirection si accès non autorisé
```

**Routage:**
- `/espace-client/*` → client, admin
- `/fournisseur/*` → provider (expert), admin
- `/admin/*` → admin uniquement

### Flux d'accès dans l'interface

[Diagram des flux]

```
┌─────────────┐
│  Accueil    │
└──────┬──────┘
       │
       ├─→ Inscription → `/client-space/register`
       │       ↓
       │    Email verification
       │       ↓
       │    → Espace Client
       │
       └─→ Connexion → `/client-space/login`
               │
               ├─ [Client] → `/espace-client/dashboard`
               ├─ [Expert] → `/fournisseur/dashboard`
               └─ [Admin]  → `/admin/dashboard`
```

## Structure des pages

### Espace Client (`/espace-client/`)

**Layout:** ClientLayout
**Pages disponibles:**
- Dashboard
- Demandes
- Consultations
- Rendez-vous
- Documents
- Factures
- Profil
- Publications (si admin)

**Rôles autorisés:** client, admin

### Espace Expert (`/fournisseur/`)

**Layout:** FournisseurLayout
**Pages disponibles:**
- Dashboard
- Demandes clients
- Clients
- Calendrier
- Documents
- Facturation
- Équipe (admin seulement)
- Rapports

**Rôles autorisés:** provider (expert), admin

### Espace Admin (`/admin/`)

**Layout:** AdminLayout
**Pages disponibles:**
- Dashboard (stats, raccourcis)
- Experts (CRUD)
- Clients (vue, recherche)
- Rapports (statistiques)
- Paramètres (configuration)

**Rôles autorisés:** admin uniquement

## Intégration Frontend

### Services

#### authService.ts

```typescript
login(email, password, userRole?: "client" | "expert" | "admin")
register(data: RegisterData)
logout()
me() - Récupère l'utilisateur courant
```

**Changements clés:**
- Endpoint `/auth/login/` pour clients
- Endpoint `/auth/staff/login/` pour experts/admins
- Mappage de rôles: "expert" → "provider"

#### expertAdminService.ts

```typescript
createExpert(payload)
listExperts()
deleteExpert(expertId)
updateExpert(expertId, payload)
```

### Types TypeScript

```typescript
type UserRole = "client" | "provider" | "admin"
type AccountType = "particulier" | "entreprise" | "cabinet"

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  role: UserRole
  accountType: AccountType
  company?: string
  avatar?: string
}
```

## Points clés d'implémentation

### 1. Séparation Admin vs Expert

**Ancien modèle:** Admin et Expert partageaient le même espace (`/fournisseur`)

**Nouveau modèle:** 
- Expert (provider) → `/fournisseur/`
- Admin → `/admin/`

### 2. Personnalisation du Login

```typescript
// src/pages/auth/LoginPage.tsx
type Espace = "client" | "expert" | "admin"

// Tabs pour sélectionner l'espace
// Titres et descriptions personnalisés par espace
// Redirection appropriée après login
```

### 3. Mappage des rôles

**Backend:** "expert", "client", "admin"
**Frontend:** "provider" (=expert), "client", "admin"

Mappage effectué dans `authService.ts`:
```typescript
function mapRole(role) {
  if (role === "expert") return "provider"
  return role
}
```

### 4. Vérification d'email obligatoire

Pour les clients:
```python
if not user.is_verified:
    raise AuthenticationFailed("Compte non vérifié...")
```

Pour les experts (créés par admin):
```python
is_verified=True  # Automatiquement défini
```

## Flux de création d'expert

```
Admin → /admin/experts
  ↓
Formulaire de création
  ├─ Prénom, Nom
  ├─ Email
  ├─ Mot de passe temporaire
  ├─ Téléphone
  └─ Spécialité
  ↓
POST /auth/staff/experts/create/
  ↓
Backend crée utilisateur:
  ├─ role="expert"
  ├─ is_verified=true
  ├─ is_staff=true
  └─ Retourne utilisateur créé
  ↓
Frontend:
  ├─ Affiche succès
  ├─ Ajoute à la liste
  └─ Réinitialise formulaire
```

## Gestion des erreurs

### LoginPage

- Email invalide
- Mot de passe incorrect
- Compte inactif
- Email non vérifié (clients uniquement)
- Accès non autorisé (wrong espace)

### RegisterPage

- Email déjà utilisé
- Mots de passe non conformes
- Champs obligatoires manquants
- Validation selon type de profil

### AdminManageExperts

- Email dupli qué
- Arguments fournier invalides
- Mot de passe faible
- Erreur serveur

## Configuration requise

### Backend

**settings.py:**
```python
REST_FRAMEWORK_SIMPLEJWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60)
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1)
    'BLACKLIST_AFTER_ROTATION': True
}
```

### Frontend

**Tokens stockés:**
```typescript
localStorage:
  - justia_token (access JWT)
  - justia_refresh_token (refresh JWT)
  - justia_user (profil utilisateur)
```

## Tests recommandés

### Unitaires

- [ ] `mapRole()` - Mappage correct des rôles
- [ ] Validation email inscription
- [ ] Validation mot de passe

### Intégration

- [ ] Client peut s'inscrire → vérifier email → se connecter
- [ ] Admin crée expert → Expert peut se connecter
- [ ] Client accède à `/admin` → redirection
- [ ] Admin accède à `/espace-client` → accès autorisé

### E2E

- [ ] Flux complet inscription client
- [ ] Flux création expert par admin
- [ ] Navigations entre espaces
- [ ] Logout et redirection

## Améliorations futures

1. **Authentification SSO/OAuth** - Login via Google/Microsoft
2. **2FA** - Authentification à deux facteurs
3. **Gestion de sessions** - Limitation du nombre de sessions
4. **Audit logging** - Traçabilité des actions
5. **Récupération de compte** - Backup codes, recovery email
6. **Permissions granulaires** - Permissions by features

## Contacts & Support

Pour des questions spécifiques:
- Modèle User: `justia_backend/apps/authentication/models.py`
- Permissions: `justia_backend/apps/core/permissions.py`
- Frontend Auth: `src/context/AuthContext.tsx`
