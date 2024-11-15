FROM python:3.12-slim


WORKDIR /usr/src

RUN pip install pipenv

RUN apt-get update \
    && apt-get install -y \
    gcc \
    netcat-traditional \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists

EXPOSE 8080
COPY Pipfile.lock Pipfile ./

ENV PIPENV_VENV_IN_PROJECT=1
RUN pipenv install --system

RUN pip install django-cors-headers

COPY entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

COPY . .

RUN chmod -R 775 .
RUN chown -R 1000:root .
USER 1000
