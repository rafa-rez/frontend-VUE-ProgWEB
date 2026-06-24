#!/bin/sh
set -e

python manage.py makemigrations core
python manage.py migrate

python - <<'PY'
import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "tcc_project.settings")

import django
django.setup()

from core.models import UnidadeAcademica

if UnidadeAcademica.objects.exists():
    print("Banco ja possui dados iniciais. Pulando load.py.")
else:
    print("Banco vazio. Populando dados iniciais com load.py.")
    from load import populate

    populate()
PY

exec "$@"
