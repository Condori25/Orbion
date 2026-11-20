
import os
import jwt

from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer


from datetime import datetime, timedelta, timezone

from datetime import date
from typing import Literal

from fastapi import status
from pydantic import BaseModel, EmailStr, Field
from pwdlib import PasswordHash
from sqlalchemy.exc import IntegrityError

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.database import engine, get_db

password_hash = PasswordHash.recommended()

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_MINUTES = 60
bearer_scheme = HTTPBearer(auto_error=False)


class CompetenciaCadastro(BaseModel):
    id_competencia: int
    nivel: Literal["Basico", "Intermediario", "Avancado"]


class CadastroVoluntario(BaseModel):
    nome: str = Field(min_length=1, max_length=100)
    telefone: str | None = Field(default=None, max_length=20)
    email: EmailStr
    senha: str = Field(min_length=8, max_length=128)
    data_nascimento: date
    areas_interesse: list[int] = Field(default_factory=list)
    competencias: list[CompetenciaCadastro] = Field(default_factory=list)

class LoginVoluntario(BaseModel):
    email: EmailStr
    senha: str = Field(min_length=1, max_length=128)


class AtualizacaoPerfil(BaseModel):
    nome: str = Field(min_length=1, max_length=100)
    telefone: str | None = Field(default=None, max_length=20)
    areas_interesse: list[int] = Field(default_factory=list)
    competencias: list[CompetenciaCadastro] = Field(default_factory=list)


app = FastAPI(
    title="Orbion API",
    description="API do projeto Orbion",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def inicio():
    return {"mensagem": "API Orbion funcionando!"}


@app.get("/api/health")
def verificar_banco():
    try:
        with engine.connect() as conexao:
            conexao.execute(text("SELECT 1"))

        return {
            "status": "conectado",
            "banco": "Supabase PostgreSQL"
        }

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Não foi possível conectar ao banco de dados."
        )
    

@app.get("/api/projetos")
def listar_projetos(db: Session = Depends(get_db)):
    try:
        resultado = db.execute(
            text("""
                SELECT
                    id_projeto,
                    titulo,
                    descricao,
                    data_inicio,
                    data_fim,
                    status,
                    imagem_url,
                    objetivos,
                    publico_alvo,
                    metodologia,
                    resultados_esperados
                FROM orbion_v2.projetos
                ORDER BY data_inicio DESC
            """)
        )

        return resultado.mappings().all()

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Erro ao consultar os projetos."
        )

@app.get("/api/areas-interesse")
def listar_areas_interesse(db: Session = Depends(get_db)):
    try:
        resultado = db.execute(
            text("""
                SELECT id_area, nome, descricao
                FROM orbion_v2.areas_interesse
                ORDER BY nome
            """)
        )

        return resultado.mappings().all()

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Erro ao consultar as áreas de interesse."
        )


@app.get("/api/competencias")
def listar_competencias(db: Session = Depends(get_db)):
    try:
        resultado = db.execute(
            text("""
                SELECT id_competencia, nome, descricao
                FROM orbion_v2.competencias
                ORDER BY nome
            """)
        )

        return resultado.mappings().all()

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Erro ao consultar as competências."
        )



@app.post("/api/contato")
def criar_contato(
    dados: dict,
    db: Session = Depends(get_db)
):
    nome = dados.get("nome", "").strip()
    email = dados.get("email", "").strip()
    assunto = dados.get("assunto", "").strip()
    mensagem = dados.get("mensagem", "").strip()

    if not all([nome, email, assunto, mensagem]):
        raise HTTPException(
            status_code=400,
            detail="Preencha todos os campos."
        )

    if len(nome) > 100 or len(email) > 150 or len(assunto) > 150:
        raise HTTPException(
            status_code=400,
            detail="Um ou mais campos ultrapassaram o limite permitido."
        )

    try:
        resultado = db.execute(
            text("""
                INSERT INTO orbion_v2.contatos
                    (nome, email, assunto, mensagem)
                VALUES
                    (:nome, :email, :assunto, :mensagem)
                RETURNING id_contato
            """),
            {
                "nome": nome,
                "email": email,
                "assunto": assunto,
                "mensagem": mensagem
            }
        )

        id_contato = resultado.scalar_one()
        db.commit()

        return {
            "mensagem": "Contato enviado com sucesso!",
            "id_contato": id_contato
        }

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Erro ao salvar o contato."
        )

@app.post("/api/cadastro", status_code=status.HTTP_201_CREATED)
def cadastrar_voluntario(
    dados: CadastroVoluntario,
    db: Session = Depends(get_db)
):
    nome = dados.nome.strip()
    email = str(dados.email).lower().strip()
    telefone = dados.telefone.strip() if dados.telefone else None

    if not nome:
        raise HTTPException(400, "Informe seu nome.")

    if telefone == "":
        telefone = None

    hoje = date.today()
    idade = hoje.year - dados.data_nascimento.year

    if (hoje.month, hoje.day) < (
        dados.data_nascimento.month,
        dados.data_nascimento.day
    ):
        idade -= 1

    if dados.data_nascimento > hoje:
        raise HTTPException(400, "Data de nascimento inválida.")

    if idade < 15:
        raise HTTPException(
            400,
            "É necessário ter pelo menos 15 anos para se cadastrar."
        )

    ids_areas = dados.areas_interesse
    ids_competencias = [
        competencia.id_competencia
        for competencia in dados.competencias
    ]

    if len(ids_areas) != len(set(ids_areas)):
        raise HTTPException(400, "Existem áreas de interesse repetidas.")

    if len(ids_competencias) != len(set(ids_competencias)):
        raise HTTPException(400, "Existem competências repetidas.")

    senha_criptografada = password_hash.hash(dados.senha)

    try:
        with db.begin():

            email_existente = db.execute(
                text("""
                    SELECT id_usuario
                    FROM orbion_v2.usuarios
                    WHERE email = :email
                """),
                {"email": email}
            ).scalar_one_or_none()

            if email_existente:
                raise HTTPException(409, "Este e-mail já está cadastrado.")

            perfil_existe = db.execute(
                text("""
                    SELECT id_perfil
                    FROM orbion_v2.perfis
                    WHERE id_perfil = 2
                """)
            ).scalar_one_or_none()

            if perfil_existe is None:
                raise HTTPException(
                    500,
                    "Perfil de voluntário não encontrado."
                )

            for id_area in ids_areas:
                existe = db.execute(
                    text("""
                        SELECT id_area
                        FROM orbion_v2.areas_interesse
                        WHERE id_area = :id
                    """),
                    {"id": id_area}
                ).scalar_one_or_none()

                if existe is None:
                    raise HTTPException(
                        400,
                        f"Área de interesse inválida: {id_area}."
                    )

            for id_competencia in ids_competencias:
                existe = db.execute(
                    text("""
                        SELECT id_competencia
                        FROM orbion_v2.competencias
                        WHERE id_competencia = :id
                    """),
                    {"id": id_competencia}
                ).scalar_one_or_none()

                if existe is None:
                    raise HTTPException(
                        400,
                        f"Competência inválida: {id_competencia}."
                    )

            id_pessoa = db.execute(
                text("""
                    INSERT INTO orbion_v2.pessoas (nome, telefone)
                    VALUES (:nome, :telefone)
                    RETURNING id_pessoa
                """),
                {
                    "nome": nome,
                    "telefone": telefone
                }
            ).scalar_one()

            id_usuario = db.execute(
                text("""
                    INSERT INTO orbion_v2.usuarios
                        (id_pessoa, email, senha_hash)
                    VALUES
                        (:id_pessoa, :email, :senha_hash)
                    RETURNING id_usuario
                """),
                {
                    "id_pessoa": id_pessoa,
                    "email": email,
                    "senha_hash": senha_criptografada
                }
            ).scalar_one()

            db.execute(
                text("""
                    INSERT INTO orbion_v2.usuarios_perfis
                        (id_usuario, id_perfil)
                    VALUES
                        (:id_usuario, 2)
                """),
                {"id_usuario": id_usuario}
            )

            id_voluntario = db.execute(
                text("""
                    INSERT INTO orbion_v2.voluntarios
                        (id_usuario, data_nascimento)
                    VALUES
                        (:id_usuario, :data_nascimento)
                    RETURNING id_voluntario
                """),
                {
                    "id_usuario": id_usuario,
                    "data_nascimento": dados.data_nascimento
                }
            ).scalar_one()

            for id_area in ids_areas:
                db.execute(
                    text("""
                        INSERT INTO orbion_v2.voluntarios_areas_interesse
                            (id_voluntario, id_area)
                        VALUES
                            (:id_voluntario, :id_area)
                    """),
                    {
                        "id_voluntario": id_voluntario,
                        "id_area": id_area
                    }
                )

            for competencia in dados.competencias:
                db.execute(
                    text("""
                        INSERT INTO orbion_v2.voluntarios_competencias
                            (id_voluntario, id_competencia, nivel)
                        VALUES
                            (:id_voluntario, :id_competencia, :nivel)
                    """),
                    {
                        "id_voluntario": id_voluntario,
                        "id_competencia": competencia.id_competencia,
                        "nivel": competencia.nivel
                    }
                )

        return {
            "mensagem": "Cadastro realizado com sucesso!",
            "id_voluntario": id_voluntario
        }

    except HTTPException:
        raise

    except IntegrityError:
        raise HTTPException(
            409,
            "Não foi possível cadastrar. Verifique se o e-mail já existe."
        )

    except Exception:
        raise HTTPException(
            500,
            "Erro interno ao realizar o cadastro."
        )
    


@app.post("/api/login")
def login_voluntario(
    dados: LoginVoluntario,
    db: Session = Depends(get_db)
):
    if not JWT_SECRET_KEY:
        raise HTTPException(
            500,
            "Configuração de autenticação indisponível."
        )

    email = str(dados.email).lower().strip()

    try:
        usuario = db.execute(
            text("""
                SELECT
                    u.id_usuario,
                    u.senha_hash,
                    u.ativo,
                    v.id_voluntario
                FROM orbion_v2.usuarios u
                INNER JOIN orbion_v2.voluntarios v
                    ON v.id_usuario = u.id_usuario
                WHERE LOWER(u.email) = :email
            """),
            {"email": email}
        ).mappings().first()

        if not usuario or not password_hash.verify(
            dados.senha,
            usuario["senha_hash"]
        ):
            raise HTTPException(
                401,
                "E-mail ou senha incorretos."
            )

        if not usuario["ativo"]:
            raise HTTPException(
                403,
                "Esta conta está desativada."
            )

        expiracao = datetime.now(timezone.utc) + timedelta(
            minutes=JWT_EXPIRATION_MINUTES
        )

        payload = {
            "sub": str(usuario["id_usuario"]),
            "id_voluntario": usuario["id_voluntario"],
            "exp": expiracao
        }

        token = jwt.encode(
            payload,
            JWT_SECRET_KEY,
            algorithm=JWT_ALGORITHM
        )

        return {
            "mensagem": "Login realizado com sucesso!",
            "access_token": token,
            "token_type": "bearer",
            "expires_in": JWT_EXPIRATION_MINUTES * 60,
            "id_voluntario": usuario["id_voluntario"]
        }

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            500,
            "Erro interno ao realizar login."
        )


@app.get("/api/perfil")
def consultar_perfil(
    credenciais: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db)
):
    if not JWT_SECRET_KEY:
        raise HTTPException(500, "Configuração de autenticação indisponível.")

    if credenciais is None:
        raise HTTPException(
            401,
            "Autenticação necessária.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    try:
        payload = jwt.decode(
            credenciais.credentials,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM]
        )

        id_usuario = int(payload["sub"])

    except (jwt.InvalidTokenError, KeyError, TypeError, ValueError):
        raise HTTPException(
            401,
            "Token inválido ou expirado.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    try:
        usuario = db.execute(
            text("""
                SELECT
                    v.id_voluntario,
                    p.nome,
                    p.telefone,
                    u.email,
                    v.data_nascimento
                FROM orbion_v2.usuarios u
                INNER JOIN orbion_v2.pessoas p
                    ON p.id_pessoa = u.id_pessoa
                INNER JOIN orbion_v2.voluntarios v
                    ON v.id_usuario = u.id_usuario
                WHERE u.id_usuario = :id_usuario
                  AND u.ativo = TRUE
            """),
            {"id_usuario": id_usuario}
        ).mappings().first()

        if usuario is None:
            raise HTTPException(401, "Conta não encontrada ou desativada.")

        areas = db.execute(
            text("""
                SELECT a.id_area, a.nome
                FROM orbion_v2.voluntarios_areas_interesse vai
                INNER JOIN orbion_v2.areas_interesse a
                    ON a.id_area = vai.id_area
                WHERE vai.id_voluntario = :id_voluntario
                ORDER BY a.nome
            """),
            {"id_voluntario": usuario["id_voluntario"]}
        ).mappings().all()

        competencias = db.execute(
            text("""
                SELECT
                    c.id_competencia,
                    c.nome,
                    vc.nivel,
                    vc.comprovado
                FROM orbion_v2.voluntarios_competencias vc
                INNER JOIN orbion_v2.competencias c
                    ON c.id_competencia = vc.id_competencia
                WHERE vc.id_voluntario = :id_voluntario
                ORDER BY c.nome
            """),
            {"id_voluntario": usuario["id_voluntario"]}
        ).mappings().all()

        return {
            "voluntario": dict(usuario),
            "areas_interesse": [dict(area) for area in areas],
            "competencias": [dict(comp) for comp in competencias]
        }

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            500,
            "Erro ao consultar o perfil do voluntário."
        )


@app.put("/api/perfil")
def atualizar_perfil(
    dados: AtualizacaoPerfil,
    credenciais: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db)
):
    if not JWT_SECRET_KEY:
        raise HTTPException(500, "Configuração de autenticação indisponível.")

    if credenciais is None:
        raise HTTPException(
            401,
            "Autenticação necessária.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    try:
        payload = jwt.decode(
            credenciais.credentials,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM]
        )
        id_usuario = int(payload["sub"])

    except (jwt.InvalidTokenError, KeyError, TypeError, ValueError):
        raise HTTPException(
            401,
            "Token inválido ou expirado.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    nome = dados.nome.strip()
    telefone = dados.telefone.strip() if dados.telefone else None

    if not nome:
        raise HTTPException(400, "Informe seu nome.")

    ids_areas = dados.areas_interesse
    ids_competencias = [
        competencia.id_competencia
        for competencia in dados.competencias
    ]

    if len(ids_areas) != len(set(ids_areas)):
        raise HTTPException(400, "Existem áreas repetidas.")

    if len(ids_competencias) != len(set(ids_competencias)):
        raise HTTPException(400, "Existem competências repetidas.")

    try:
        with db.begin():
            usuario = db.execute(
                text("""
                    SELECT v.id_voluntario, p.id_pessoa
                    FROM orbion_v2.usuarios u
                    INNER JOIN orbion_v2.pessoas p
                        ON p.id_pessoa = u.id_pessoa
                    INNER JOIN orbion_v2.voluntarios v
                        ON v.id_usuario = u.id_usuario
                    WHERE u.id_usuario = :id_usuario
                      AND u.ativo = TRUE
                """),
                {"id_usuario": id_usuario}
            ).mappings().first()

            if usuario is None:
                raise HTTPException(
                    401,
                    "Conta não encontrada ou desativada."
                )

            for id_area in ids_areas:
                existe = db.execute(
                    text("""
                        SELECT id_area
                        FROM orbion_v2.areas_interesse
                        WHERE id_area = :id
                    """),
                    {"id": id_area}
                ).scalar_one_or_none()

                if existe is None:
                    raise HTTPException(400, f"Área inválida: {id_area}.")

            for id_competencia in ids_competencias:
                existe = db.execute(
                    text("""
                        SELECT id_competencia
                        FROM orbion_v2.competencias
                        WHERE id_competencia = :id
                    """),
                    {"id": id_competencia}
                ).scalar_one_or_none()

                if existe is None:
                    raise HTTPException(
                        400,
                        f"Competência inválida: {id_competencia}."
                    )

            db.execute(
                text("""
                    UPDATE orbion_v2.pessoas
                    SET nome = :nome,
                        telefone = :telefone
                    WHERE id_pessoa = :id_pessoa
                """),
                {
                    "nome": nome,
                    "telefone": telefone,
                    "id_pessoa": usuario["id_pessoa"]
                }
            )

            db.execute(
                text("""
                    DELETE FROM orbion_v2.voluntarios_areas_interesse
                    WHERE id_voluntario = :id_voluntario
                """),
                {"id_voluntario": usuario["id_voluntario"]}
            )

            for id_area in ids_areas:
                db.execute(
                    text("""
                        INSERT INTO orbion_v2.voluntarios_areas_interesse
                            (id_voluntario, id_area)
                        VALUES
                            (:id_voluntario, :id_area)
                    """),
                    {
                        "id_voluntario": usuario["id_voluntario"],
                        "id_area": id_area
                    }
                )

            db.execute(
                text("""
                    DELETE FROM orbion_v2.voluntarios_competencias
                    WHERE id_voluntario = :id_voluntario
                """),
                {"id_voluntario": usuario["id_voluntario"]}
            )

            for competencia in dados.competencias:
                db.execute(
                    text("""
                        INSERT INTO orbion_v2.voluntarios_competencias
                            (id_voluntario, id_competencia, nivel)
                        VALUES
                            (:id_voluntario, :id_competencia, :nivel)
                    """),
                    {
                        "id_voluntario": usuario["id_voluntario"],
                        "id_competencia": competencia.id_competencia,
                        "nivel": competencia.nivel
                    }
                )

        return {"mensagem": "Perfil atualizado com sucesso!"}

    except HTTPException:
        raise

    except IntegrityError:
        raise HTTPException(400, "Não foi possível atualizar o perfil.")

    except Exception:
        raise HTTPException(500, "Erro ao atualizar o perfil.")
