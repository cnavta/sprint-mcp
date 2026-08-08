# Sprint Lifecycle Hooks - Python/Django Examples

Example hooks for Python/Django projects demonstrating sprint lifecycle automation.

## Quick Start

```bash
# Copy hook to your project's .sprint-hooks/ directory
cp examples/sprint-hooks/python-django/post-worktree-create .sprint-hooks/

# Ensure hook is executable
chmod +x .sprint-hooks/post-worktree-create
```

## Available Hooks

### `post-worktree-create`

**When it runs**: After sprint worktree and planning directory are created (during `start-sprint`)

**Behavior**: NON-BLOCKING - Failures logged but don't prevent sprint creation

**What it does**:
1. Creates Python virtual environment (`python3 -m venv venv`)
2. Upgrades pip to latest version
3. Installs dependencies from `requirements.txt` or `requirements/dev.txt`
4. Creates `.env` file from template (`.env.template` or `.env.example`)
5. Runs Django database migrations (`python manage.py migrate`)
6. Collects static files (`python manage.py collectstatic`)
7. Runs test suite to verify setup (`python manage.py test` or `pytest`)

**Environment Variables**:
- `SPRINT_ID` - Sprint identifier (e.g., `sprint-16-rgo90d`)
- `SPRINT_WORKTREE` - Absolute path to worktree (e.g., `.worktrees/sprint-16-rgo90d`)
- `SPRINT_PLANNING_DIR` - Absolute path to planning directory
- `SPRINT_BRANCH` - Feature branch name (e.g., `feature/sprint-16-rgo90d-django-feature`)
- `SPRINT_EVENT` - Always `post-worktree-create`

**Example output**:
```
🚀 post-worktree-create: Automating Python/Django worktree setup for sprint-16-rgo90d
   Worktree: /path/.worktrees/sprint-16-rgo90d
   Branch: feature/sprint-16-rgo90d-django-feature

🐍 Creating Python virtual environment...
✅ Virtual environment created
📦 Upgrading pip...
✅ pip upgraded
📦 Installing Python dependencies...
✅ Dependencies installed from requirements.txt
📝 Setting up environment file...
✅ Created .env from .env.template
🗃️  Running database migrations...
   Running Django migrations...
✅ Migrations applied
📁 Collecting static files...
✅ Static files collected
🧪 Running tests to verify setup...
✅ Test suite executed
✅ Python/Django worktree setup complete! Ready for sprint work.
   Next: cd /path/.worktrees/sprint-16-rgo90d && source venv/bin/activate && git status
```

---

## Project Structure Support

This hook supports multiple Python/Django project structures:

### Standard Django Structure
```
project/
├── manage.py
├── requirements.txt
├── myapp/
│   ├── models.py
│   ├── views.py
│   └── ...
└── venv/ (created by hook)
```

### Requirements in Subdirectory
```
project/
├── manage.py
├── requirements/
│   ├── base.txt
│   ├── dev.txt
│   └── prod.txt
└── venv/ (created by hook)
```

### Non-Django Python Project
```
project/
├── requirements.txt
├── src/
│   └── ...
├── tests/
│   └── test_*.py
└── venv/ (created by hook)
```

---

## Customization

### Adding Database Setup

Create superuser automatically (uncomment in hook):

```bash
if [ -f "manage.py" ]; then
  python manage.py createsuperuser --noinput \
    --username=admin \
    --email=admin@example.com
fi
```

Set superuser password in `.env`:
```bash
DJANGO_SUPERUSER_PASSWORD=your-secure-password
```

### Custom Requirements Files

The hook automatically detects:
- `requirements.txt` (standard)
- `requirements/dev.txt` (development dependencies)
- Both (installs both if present)

For custom requirements structure, modify the hook:

```bash
# Example: Install from requirements/local.txt
if [ -f "requirements/local.txt" ]; then
  pip install -r requirements/local.txt
fi
```

### PostgreSQL/MySQL Setup

For PostgreSQL or MySQL databases, ensure connection details are in `.env.template`:

```bash
# .env.template
DATABASE_ENGINE=postgresql
DATABASE_NAME=mydb
DATABASE_USER=myuser
DATABASE_PASSWORD=password
DATABASE_HOST=localhost
DATABASE_PORT=5432
```

The hook will copy this to `.env` and migrations will connect to your database.

### Redis/Celery Setup

Start Redis and Celery workers after setup:

```bash
# Add to hook after migrations
if command -v redis-server &>/dev/null; then
  echo "🔴 Starting Redis..."
  redis-server --daemonize yes
fi

if grep -q "celery" requirements.txt 2>/dev/null; then
  echo "🌿 Starting Celery worker..."
  celery -A myproject worker --detach
fi
```

---

## Additional Hooks for Python/Django

### `on-status-change` (Python/Django version)

Create `.sprint-hooks/on-status-change` (bash script):

```bash
#!/bin/bash
set -e

cd "$SPRINT_WORKTREE"
source venv/bin/activate

if [ "$SPRINT_LIFECYCLE_PHASE" = "pre" ]; then
  if [ "$SPRINT_STATUS_TO" = "complete" ]; then
    echo "Running Django checks before completion..."
    python manage.py check
    python manage.py test
  fi
fi
```

### `pre-worktree-remove` (Python/Django version)

Create `.sprint-hooks/pre-worktree-remove` (bash script):

```bash
#!/bin/bash
set -e

cd "$SPRINT_WORKTREE"

# Check for uncommitted migrations
if [ -d "*/migrations" ]; then
  UNCOMMITTED_MIGRATIONS=$(git status --short | grep "migrations/.*\.py$" | wc -l)
  if [ "$UNCOMMITTED_MIGRATIONS" -gt 0 ]; then
    echo "❌ ERROR: Uncommitted migration files detected"
    git status --short | grep "migrations/.*\.py$"
    exit 1
  fi
fi

# Stop Celery workers
pkill -f "celery.*$SPRINT_ID" || true
```

---

## Virtual Environment Management

### Activating Virtual Environment

Always activate venv before working in the worktree:

```bash
cd .worktrees/sprint-16-rgo90d
source venv/bin/activate
python --version  # Should show venv Python
```

### Deactivating Virtual Environment

```bash
deactivate
```

### Deleting Virtual Environment

Virtual environment is in the worktree and will be removed during cleanup:

```bash
# This removes venv automatically
cleanup-sprint sprint-16-rgo90d
```

---

## Troubleshooting

### Hook fails with "python3: command not found"

Ensure Python 3 is installed:

```bash
python3 --version
# or
python --version
```

Install Python 3 if needed:
```bash
# macOS
brew install python3

# Ubuntu/Debian
sudo apt install python3 python3-venv

# CentOS/RHEL
sudo yum install python3
```

### Migrations fail with database connection error

Check `.env` file has correct database credentials:

```bash
cat .env | grep DATABASE
```

For PostgreSQL/MySQL, ensure the database server is running:

```bash
# PostgreSQL
pg_isready

# MySQL
mysqladmin ping
```

### Dependencies fail to install

Check `requirements.txt` syntax:

```bash
pip install -r requirements.txt  # Test manually
```

Common issues:
- Missing system dependencies (e.g., `libpq-dev` for psycopg2)
- Incompatible package versions
- Private packages requiring authentication

### Virtual environment not activated

The hook creates `venv` but doesn't activate it in your shell. After hook completes, manually activate:

```bash
source venv/bin/activate
```

---

## Best Practices

1. **Use `.env.template`**: Commit template with placeholder values, not actual secrets
2. **Test requirements.txt**: Ensure it installs cleanly before committing
3. **Keep migrations committed**: Don't work with uncommitted migrations
4. **Use virtual environments**: Never install packages globally
5. **Document setup**: Update README with any manual steps the hook can't automate

---

## Integration with Node.js Hooks

If your project has both Python backend and Node.js frontend, you can use both hooks:

```bash
# .sprint-hooks/post-worktree-create (hybrid)
#!/bin/bash
set -e

# Python backend setup
echo "Setting up Python backend..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate

# Node.js frontend setup
cd ../frontend
echo "Setting up Node.js frontend..."
npm ci
npm run build

echo "✅ Full-stack setup complete!"
```

---

## Learn More

- [Django Documentation](https://docs.djangoproject.com/)
- [Python Virtual Environments](https://docs.python.org/3/library/venv.html)
- [Node.js/TypeScript Examples](../node-typescript/) - Additional hook examples
- [Sprint Protocol Documentation](../../../AGENTS.md) - Section 2.2.2
