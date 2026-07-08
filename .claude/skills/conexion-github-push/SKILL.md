---
name: conexion-github-push
description: Diagnosticar y resolver fallas de push/escritura a GitHub (403) en sesiones remotas de Claude Code, incluyendo el arranque de un repositorio vacío con flujo PR. Usar cuando git push devuelve 403 "Permission denied", la API responde "Resource not accessible by integration", el repo no tiene rama main, o hay que crear el PR inicial de un repo recién creado.
---

# Conexión y push a GitHub en sesiones remotas

Playbook probado en este repo (julio 2026) para cuando la escritura a GitHub falla desde una sesión remota de Claude Code.

## Cómo funciona el acceso en sesiones remotas

- TODO el tráfico a github.com/api.github.com (git, `gh`, curl, MCP) pasa por un proxy de sesión que inyecta sus propias credenciales. No sirve configurar otro token (`GH_TOKEN` del entorno aparece como inválido: es esperado).
- El proxy limita el alcance a los repos de la sesión: descargas de otros repos (p. ej. binarios de releases) devuelven 403 "not enabled for this session". Para instalar herramientas usa `apt` en su lugar (ej.: `apt-get install -y gh`).
- Solo se puede pushear a la rama de sesión designada `claude/...` (y lo autorizado explícitamente por el usuario).

## Diagnóstico del 403 (en orden)

1. `git push` → `remote: Permission to <repo> denied to <usuario>`: la autenticación funciona pero falta permiso de **escritura**.
2. Confirmar con la API: si create/update vía MCP devuelve `403 Resource not accessible by integration`, la GitHub App de Claude no está instalada o no tiene *Contents: Read and write* sobre el repo.
3. Mensaje definitivo del proxy: `gh api repos/<owner>/<repo>` → "GitHub access is not enabled for this session. An org admin must connect the Claude GitHub App".

**Solución (la hace el usuario, ~2 min):** instalar la app en https://github.com/apps/claude (o vía claude.ai/settings/connectors), seleccionar el repo y aceptar los permisos. El efecto es inmediato: reintentar `git push` sin reiniciar la sesión.

**Mientras tanto:** no perder trabajo — commitear localmente y enviar respaldo al usuario con `git bundle create <archivo>.bundle <rama>` + SendUserFile.

## Arranque de repo vacío con flujo PR (nada directo a main)

Un repo sin commits no tiene `main`, y sin `main` no se puede abrir PR. Secuencia probada:

1. Pushear la rama de sesión con el trabajo: `git push -u origin claude/...` (la primera rama pusheada queda como default del repo).
2. Crear un commit inicial VACÍO como raíz de `main`:
   ```bash
   EMPTY_TREE=$(git hash-object -t tree /dev/null)
   INIT=$(git commit-tree $EMPTY_TREE -m "chore: commit inicial")
   git branch main $INIT
   # ojo: para re-firmar/amendar un commit vacío hace falta --allow-empty
   ```
3. Rebasar la rama de trabajo sobre main para que compartan historia (GitHub no crea PRs entre historias no relacionadas): `git rebase --onto main <sha-raiz-anterior> claude/...` (verificar con `git log --graph` que el commit inicial no quedó duplicado).
4. Pushear `main` (solo el commit vacío) y force-pushear la rama de sesión. **Ambas acciones las bloquea el clasificador de permisos hasta que el usuario las nombre explícitamente** — pedirle que responda algo como: "sí: push del commit inicial vacío a main y force-push de <rama>". Ejecutar cada push en comandos separados, no encadenados.
5. Crear el PR en borrador vía MCP (`create_pull_request` con `draft: true`), suscribirse a la actividad, esperar CI verde y hacer merge (squash deja `main` limpio).

## Limitaciones conocidas (no insistir)

- **Configuración del repo** (rama por defecto, settings): el proxy bloquea todas las escrituras de settings ("Repository settings writes are not permitted through this proxy"). Lo debe hacer el usuario en GitHub → Settings. La rama por defecto queda en la primera rama pusheada; es cosmético si los contenidos coinciden.
- **Firmas:** los commits deben firmarse (config ya presente en ~/.gitconfig) y el committer debe ser `noreply@anthropic.com`; el stop-hook del repo lo verifica.
- `winget` no existe aquí (es de Windows); el entorno es Linux.
