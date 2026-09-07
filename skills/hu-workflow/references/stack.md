# Stack, rutas y comandos — VISTA

Referencia operativa del proyecto. Evita redescubrir la estructura en cada HU.

## Arranque completo

El backend no levanta sin Postgres y sin la API key de Gemini.

```bash
# 1. Base de datos (Postgres 17 + pgAdmin en :5050)
cd /home/curaca/icesi/pdg/backend && docker compose up -d

# 2. Backend en :8080
make run

# 3. Frontend en :5173
cd /home/curaca/icesi/pdg/frontend && npm run dev
```

`frontend/vite.config.ts` proxea `/api` a `http://localhost:8080`. **No hay configuración de CORS en
el backend**: fuera del proxy de Vite, cualquier origen distinto falla. Si una HU expone el frontend
en otro origen, añadir CORS es parte de esa HU.

Credenciales sembradas por `DataSeeder`: `admin@vista.com` / `admin123`.

## Backend — `/home/curaca/icesi/pdg/backend`

Spring Boot 4.0.6, Java 21, Maven wrapper, empaquetado **war** (Tomcat `provided`).

| Comando | Qué hace |
|---|---|
| `make run` | `mvnw spring-boot:run` |
| `make test` | `mvnw test` |
| `make format` | `mvnw spotless:apply` — lefthook lo corre en pre-commit |
| `make build` | `mvnw clean package -DskipTests` |

Paquete raíz `com.vista.pdg`:

```
controller/          StructureController (POST /api/generate), AlgorithmController
  dto/               records de request
auth/                controller/ service/ repository/ entity/ dto/ — User, Role, Permission
security/            SecurityConfig, JwtAuthFilter, JwtTokenProvider
service/
  llm/               LlmAdapter (interfaz) → AbstractLlmAdapter (retry) → GeminiLlmAdapter
  sdd/               ContractBuilder, ContractValidator (Visitor) + validator/ por tipo
  generator/         Strategy por tipo de estructura + GeneratorDispatcher
  layout/            Strategy por layout 3D + LayoutDispatcher
  algorithm/         AvlStepsService
model/               contract/ generated/ response/ math/
exception/           GlobalExceptionHandler + excepciones de dominio
seeder/              DataSeeder
```

Configuración en `src/main/resources/application.properties`; secretos en `backend/.env`
(gitignored, cargado por `spring-dotenv` vía `spring.config.import`).

Notas que afectan a casi cualquier HU:

- `spring.jpa.hibernate.ddl-auto=update`, **sin Flyway ni Liquibase**. Un cambio de esquema se aplica
  solo al arrancar y no queda versionado. Si una HU necesita migrar datos (renombrar un rol, backfill
  de una columna), hazlo explícito en el seeder o en un componente de migración, no lo dejes al
  `ddl-auto`.
- `User` y `Role` cargan sus relaciones con `FetchType.EAGER`, así que no hay problemas de lazy
  loading fuera de transacción, pero cuidado al añadir colecciones nuevas.
- `SecurityConfig` deja `permitAll` en `/api/auth/**`, `/api/generate` y `/api/algorithm/steps`.
- Las entidades `Permission` existen y se administran, pero **no se aplican en ningún sitio**: no hay
  un solo `@PreAuthorize`. La única autorización real es `hasRole("ADMIN")` sobre `/api/admin/**`.
- `spring-boot-testcontainers` y `testcontainers-junit-jupiter` están declarados y sin usar.

## Frontend — `/home/curaca/icesi/pdg/frontend`

React 19, Vite 8, TypeScript 6, Tailwind v4, react-three-fiber, Zustand, axios.

| Comando | Qué hace |
|---|---|
| `npm run dev` | Vite en :5173 |
| `npm run build` | `tsc -b && vite build` |
| `npm run lint` | ESLint |
| `npx tsc -b` | Solo typecheck |

```
src/
  main.tsx           router, AuthProvider, fuerza .dark
  App.tsx            shell: sidebar + canvas + paneles
  pages/             LoginPage, AdminPage
  components/        AppSidebar, ChatPanel, AlgorithmPanel, CanvasOverlay, GraphVis3D
    graph/           GraphScene, NodeSphere, EdgeSegment, EmptyScene
    ui/              primitivos shadcn: button, badge, separator, scroll-area, textarea
  contexts/          AuthContext (localStorage: vista_token, vista_user)
  services/          graphService, adminService
  store/             graphStore (Zustand)
  types/             graph.ts, auth.ts
  lib/http.ts        axios: baseURL /api, interceptor de Bearer, timeout 30 s
```

El alias `@/` apunta a `src/`.

Si `npx tsc -b` falla por módulos que sí están en `package.json`, `node_modules` está desactualizado:
`npm install`.

## Cypress

**No está instalado todavía.** Montaje inicial:

```bash
cd /home/curaca/icesi/pdg/frontend
npm install -D cypress
npx cypress open   # genera el andamiaje la primera vez
```

`cypress.config.ts`:

```ts
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.ts',
  },
});
```

Specs en `cypress/e2e/`, uno por criterio de aceptación. Añade `cypress/videos/` y
`cypress/screenshots/` al `.gitignore`.

Selecciona siempre por `data-cy`. Las clases de Tailwind cambian con cada ajuste visual y el texto
cambia con cada corrección de copy; en ambos casos el test se caería sin que la app se hubiera roto.

## Git

Dos repos independientes, ambos con remoto en la organización `vista-pdg`, `gh` autenticado.

```bash
BR=feat/HU-XX-slug
for r in backend frontend; do git -C /home/curaca/icesi/pdg/$r checkout -b $BR; done
```

Commits convencionales con scope: `feat(backend): ...`, `fix(frontend): ...`,
`chore(backend): ...`. El historial del frontend a veces antepone la clave del tablero
(`feat: PDGVISTA-15 improved users and permissions management`); úsala si el usuario la da.

Lefthook corre Spotless sobre los `.java` en pre-commit. Corre `make format` antes de commitear para
que el hook no reescriba archivos a mitad del commit.

## Fuera del alcance del código

- `poc_3d/` — prototipo anterior (backend Node + TypeScript con `geminiService.ts`), reemplazado por
  `backend/`. Tiene cambios sin commitear. No es referencia válida.
- `pen_design/` — vacío.
