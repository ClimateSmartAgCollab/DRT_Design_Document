FROM python:3.12-slim


WORKDIR /usr/src

RUN pip install pipenv

EXPOSE 8080
COPY Pipfile.lock Pipfile ./

ENV PIPENV_VENV_IN_PROJECT=1
RUN pipenv install --system

COPY . .

RUN chmod -R 775 .
RUN chown -R 1000:root .
USER 1000
