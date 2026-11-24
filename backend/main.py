
import os
import jwt

from dotenv import load_dotenv

from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from supabase import create_client

from datetime import datetime, timedelta, timezone

from datetime import date
from typing import Literal

from fastapi import status
from pydantic import BaseModel, EmailStr, Field
from pwdlib import PasswordHash
from sqlalchemy.exc import IntegrityError

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

from backend.database import engine, get_db

password_hash = PasswordHash.recommended()

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_BUCKET = "projetos-imagens"

supabase_admin = (
    create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
    else None
)
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_MINUTES = 60
bearer_scheme = HTTPBearer(auto_error=False)

def verificar_administrador(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
):
    if not JWT_SECRET_KEY:
        raise HTTPException(
            500,
            "Configuração de autenticação indisponível."
        )

    if not credentials:
        raise HTTPException(
            401,
            "Autenticação necessária."
        )

    try:
        payload = jwt.decode(
            credentials.credentials,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM]
        )

        id_usuario = int(payload["sub"])

        administrador = db.execute(
            text("""
                SELECT u.id_usuario
                FROM orbion_v2.usuarios u
                INNER JOIN orbion_v2.usuarios_perfis up
                    ON up.id_usuario = u.id_usuario
                WHERE u.id_usuario = :id_usuario
                  AND u.ativo = TRUE
                  AND up.id_perfil = 1
            """),
            {"id_usuario": id_usuario}
        ).mappings().first()

        if not administrador:
            raise HTTPException(
                403,
                "Acesso permitido somente para administradores."
            )

        return administrador

    except HTTPException:
        raise

    except (jwt.PyJWTError, KeyError, TypeError, ValueError):
        raise HTTPException(
            401,
            "Token inválido ou expirado."
        )



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


class ProjetoDados(BaseModel):
    titulo: str = Field(min_length=1)
    descricao: str = Field(min_length=1)
    data_inicio: date
    data_fim: date | None = None
    status: str = "Planejado"
    imagem_url: str | None = None
    objetivos: str | None = None
    publico_alvo: str | None = None
    metodologia: str | None = None
    resultados_esperados: str | None = None



app = FastAPI(
    title="Orbion API",
    description="API do projeto Orbion",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://orbionz.netlify.app",
        "http://localhost:5500",
        "http://127.0.0.1:5500"
    ],
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
    

@app.post("/api/projetos")
def cadastrar_projeto(
    dados: ProjetoDados,
    db: Session = Depends(get_db),
    administrador=Depends(verificar_administrador)
):
    try:
        resultado = db.execute(
            text("""
                INSERT INTO orbion_v2.projetos (
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
                )
                VALUES (
                    :titulo,
                    :descricao,
                    :data_inicio,
                    :data_fim,
                    :status,
                    :imagem_url,
                    :objetivos,
                    :publico_alvo,
                    :metodologia,
                    :resultados_esperados
                )
                RETURNING id_projeto
            """),
            dados.model_dump()
        )

        id_projeto = resultado.scalar_one()
        db.commit()

        return {
            "mensagem": "Projeto cadastrado com sucesso!",
            "id_projeto": id_projeto
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        raise HTTPException(
            500,
            "Erro interno ao cadastrar projeto."
        )



@app.put("/api/projetos/{id_projeto}")
def atualizar_projeto(
    id_projeto: int,
    dados: ProjetoDados,
    db: Session = Depends(get_db),
    administrador=Depends(verificar_administrador)
):
    try:
        resultado = db.execute(
            text("""
                UPDATE orbion_v2.projetos
                SET
                    titulo = :titulo,
                    descricao = :descricao,
                    data_inicio = :data_inicio,
                    data_fim = :data_fim,
                    status = :status,
                    imagem_url = COALESCE(:imagem_url, imagem_url),
                    objetivos = :objetivos,
                    publico_alvo = :publico_alvo,
                    metodologia = :metodologia,
                    resultados_esperados = :resultados_esperados
                WHERE id_projeto = :id_projeto
                RETURNING id_projeto
            """),
            {
                **dados.model_dump(),
                "id_projeto": id_projeto
            }
        )

        projeto = resultado.scalar_one_or_none()

        if projeto is None:
            raise HTTPException(
                404,
                "Projeto não encontrado."
            )

        db.commit()

        return {
            "mensagem": "Projeto atualizado com sucesso!",
            "id_projeto": projeto
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception as erro:
    db.rollback()

    print("ERRO AO ATUALIZAR PROJETO:", repr(erro), flush=True)

    import traceback
    traceback.print_exc()

    raise HTTPException(
        500,
        "Erro interno ao atualizar projeto."
    )



@app.delete("/api/projetos/{id_projeto}")
def excluir_projeto(
    id_projeto: int,
    db: Session = Depends(get_db),
    administrador=Depends(verificar_administrador)
):
    try:
        # Buscar a capa do projeto
        projeto = db.execute(
            text("""
                SELECT imagem_storage_path
                FROM orbion_v2.projetos
                WHERE id_projeto = :id
            """),
            {"id": id_projeto}
        ).mappings().first()

        if not projeto:
            raise HTTPException(
                404,
                "Projeto não encontrado."
            )

        # Buscar os caminhos das imagens da galeria
        imagens = db.execute(
            text("""
                SELECT storage_path
                FROM orbion_v2.imagens_projetos
                WHERE id_projeto = :id
            """),
            {"id": id_projeto}
        ).mappings().all()

        caminhos = [
            imagem["storage_path"]
            for imagem in imagens
            if imagem["storage_path"]
        ]

        if projeto["imagem_storage_path"]:
            caminhos.append(projeto["imagem_storage_path"])

        # Excluir arquivos do Storage
        if caminhos:
            if not supabase_admin:
                raise HTTPException(
                    500,
                    "Storage do Supabase não configurado."
                )

            supabase_admin.storage.from_(
                SUPABASE_BUCKET
            ).remove(caminhos)

        # Excluir projeto e registros relacionados
        db.execute(
            text("""
                DELETE FROM orbion_v2.projetos
                WHERE id_projeto = :id
            """),
            {"id": id_projeto}
        )

        db.commit()

        return {
            "mensagem": "Projeto e imagens excluídos com sucesso!",
            "id_projeto": id_projeto
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception as erro:
        db.rollback()
        print("Erro ao excluir projeto:", erro)

        raise HTTPException(
            500,
            "Erro interno ao excluir projeto."
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
                    v.id_voluntario,
                    EXISTS (
                        SELECT 1
                        FROM orbion_v2.usuarios_perfis up
                        WHERE up.id_usuario = u.id_usuario
                          AND up.id_perfil = 1
                    ) AS is_admin
                FROM orbion_v2.usuarios u
                LEFT JOIN orbion_v2.voluntarios v
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
            "is_admin": usuario["is_admin"],
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
            "id_voluntario": usuario["id_voluntario"],
            "is_admin": usuario["is_admin"]
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
    

@app.get("/api/perfil/inscricoes")
def consultar_inscricoes(
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
        resultado = db.execute(
            text("""
                SELECT
                    p.id_projeto,
                    p.titulo,
                    p.descricao,
                    p.data_inicio,
                    p.data_fim,
                    p.imagem_url,
                    vp.data_inscricao,
                    vp.status AS status_inscricao
                FROM orbion_v2.voluntarios_projetos vp
                INNER JOIN orbion_v2.voluntarios v
                    ON v.id_voluntario = vp.id_voluntario
                INNER JOIN orbion_v2.usuarios u
                    ON u.id_usuario = v.id_usuario
                INNER JOIN orbion_v2.projetos p
                    ON p.id_projeto = vp.id_projeto
                WHERE u.id_usuario = :id_usuario
                  AND u.ativo = TRUE
                ORDER BY vp.data_inscricao DESC
            """),
            {"id_usuario": id_usuario}
        ).mappings().all()

        return [dict(inscricao) for inscricao in resultado]

    except Exception:
        raise HTTPException(
            500,
            "Erro ao consultar as inscrições do voluntário."
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


@app.post("/api/projetos/{id_projeto}/imagens")
async def enviar_imagem_projeto(
    id_projeto: int,
    arquivo: UploadFile = File(...),
    descricao: str = Form(""),
    ordem: int = Form(0),
    db: Session = Depends(get_db),
    administrador=Depends(verificar_administrador)
):
    import uuid

    if not supabase_admin:
        raise HTTPException(
            status_code=500,
            detail="Storage do Supabase não configurado."
        )

    tipos_permitidos = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp"
    }

    extensao = tipos_permitidos.get(arquivo.content_type)

    if not extensao:
        raise HTTPException(
            status_code=400,
            detail="Formato inválido. Envie JPG, PNG ou WEBP."
        )

    conteudo = await arquivo.read()

    if not conteudo:
        raise HTTPException(
            status_code=400,
            detail="O arquivo está vazio."
        )

    if len(conteudo) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="A imagem deve ter no máximo 5 MB."
        )

    projeto = db.execute(
        text("""
            SELECT id_projeto
            FROM orbion_v2.projetos
            WHERE id_projeto = :id
        """),
        {"id": id_projeto}
    ).fetchone()

    if not projeto:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")

    caminho = f"projetos/{id_projeto}/{uuid.uuid4().hex}{extensao}"

    try:
        supabase_admin.storage.from_(SUPABASE_BUCKET).upload(
            caminho,
            conteudo,
            file_options={
                "content-type": arquivo.content_type,
                "upsert": "false"
            }
        )

        imagem_url = supabase_admin.storage.from_(
            SUPABASE_BUCKET
        ).get_public_url(caminho)

        resultado = db.execute(
            text("""
                INSERT INTO orbion_v2.imagens_projetos
                    (id_projeto, imagem_url, storage_path, descricao, ordem)
                VALUES
                    (:id_projeto, :imagem_url, :storage_path, :descricao, :ordem)
                RETURNING id_imagem
            """),
            {
                "id_projeto": id_projeto,
                "imagem_url": imagem_url,
                "storage_path": caminho,
                "descricao": descricao,
                "ordem": ordem
            }
        )

        id_imagem = resultado.scalar_one()
        db.commit()

        return {
            "mensagem": "Imagem enviada com sucesso.",
            "id_imagem": id_imagem,
            "imagem_url": imagem_url
        }

    except Exception as erro:
        db.rollback()

        try:
            supabase_admin.storage.from_(SUPABASE_BUCKET).remove([caminho])
        except Exception:
            pass

        print("Erro ao enviar imagem:", erro)
        raise HTTPException(
            status_code=500,
            detail="Não foi possível enviar a imagem."
        )

@app.get("/api/projetos/{id_projeto}/imagens")
def listar_imagens_projeto(
    id_projeto: int,
    db: Session = Depends(get_db)
):
    projeto = db.execute(
        text("""
            SELECT id_projeto
            FROM orbion_v2.projetos
            WHERE id_projeto = :id
        """),
        {"id": id_projeto}
    ).fetchone()

    if not projeto:
        raise HTTPException(
            status_code=404,
            detail="Projeto não encontrado."
        )

    imagens = db.execute(
        text("""
            SELECT
                id_imagem,
                id_projeto,
                imagem_url,
                descricao,
                ordem,
                criado_em
            FROM orbion_v2.imagens_projetos
            WHERE id_projeto = :id
            ORDER BY ordem ASC, criado_em ASC
        """),
        {"id": id_projeto}
    ).mappings().all()

    return [dict(imagem) for imagem in imagens]

@app.delete("/api/projetos/imagens/{id_imagem}")
def excluir_imagem_projeto(
    id_imagem: int,
    db: Session = Depends(get_db),
    administrador=Depends(verificar_administrador)
):
    if not supabase_admin:
        raise HTTPException(
            status_code=500,
            detail="Storage do Supabase não configurado."
        )

    imagem = db.execute(
        text("""
            SELECT id_imagem, storage_path
            FROM orbion_v2.imagens_projetos
            WHERE id_imagem = :id
        """),
        {"id": id_imagem}
    ).mappings().first()

    if not imagem:
        raise HTTPException(
            status_code=404,
            detail="Imagem não encontrada."
        )

    try:
        if imagem["storage_path"]:
            supabase_admin.storage.from_(SUPABASE_BUCKET).remove(
                [imagem["storage_path"]]
            )

        db.execute(
            text("""
                DELETE FROM orbion_v2.imagens_projetos
                WHERE id_imagem = :id
            """),
            {"id": id_imagem}
        )

        db.commit()

        return {"mensagem": "Imagem excluída com sucesso."}

    except Exception as erro:
        db.rollback()
        print("Erro ao excluir imagem:", erro)

        raise HTTPException(
            status_code=500,
            detail="Não foi possível excluir a imagem."
        )


@app.post("/api/projetos/{id_projeto}/imagem-capa")
async def enviar_imagem_capa(
    id_projeto: int,
    arquivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    administrador=Depends(verificar_administrador)
):
    import uuid

    if not supabase_admin:
        raise HTTPException(
            500,
            "Storage do Supabase não configurado."
        )

    tipos_permitidos = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp"
    }

    extensao = tipos_permitidos.get(arquivo.content_type)

    if not extensao:
        raise HTTPException(
            400,
            "Formato inválido. Envie JPG, PNG ou WEBP."
        )

    conteudo = await arquivo.read()

    if len(conteudo) > 5 * 1024 * 1024:
        raise HTTPException(
            400,
            "A imagem deve ter no máximo 5 MB."
        )

    if not conteudo:
        raise HTTPException(400, "O arquivo está vazio.")

    projeto = db.execute(
        text("""
            SELECT imagem_storage_path
            FROM orbion_v2.projetos
            WHERE id_projeto = :id
        """),
        {"id": id_projeto}
    ).mappings().first()

    if not projeto:
        raise HTTPException(404, "Projeto não encontrado.")

    caminho = f"projetos/{id_projeto}/capa_{uuid.uuid4().hex}{extensao}"

    try:
        supabase_admin.storage.from_(SUPABASE_BUCKET).upload(
            caminho,
            conteudo,
            file_options={
                "content-type": arquivo.content_type,
                "upsert": "false"
            }
        )

        imagem_url = supabase_admin.storage.from_(
            SUPABASE_BUCKET
        ).get_public_url(caminho)

        db.execute(
            text("""
                UPDATE orbion_v2.projetos
                SET
                    imagem_url = :imagem_url,
                    imagem_storage_path = :caminho
                WHERE id_projeto = :id
            """),
            {
                "imagem_url": imagem_url,
                "caminho": caminho,
                "id": id_projeto
            }
        )

        db.commit()

        caminho_anterior = projeto["imagem_storage_path"]

        if caminho_anterior:
            try:
                supabase_admin.storage.from_(
                    SUPABASE_BUCKET
                ).remove([caminho_anterior])
            except Exception as erro:
                print("Aviso: não foi possível remover a capa anterior:", erro)

        return {
            "mensagem": "Imagem de capa enviada com sucesso!",
            "imagem_url": imagem_url
        }

    except Exception as erro:
        db.rollback()

        try:
            supabase_admin.storage.from_(
                SUPABASE_BUCKET
            ).remove([caminho])
        except Exception:
            pass

        print("Erro ao enviar imagem de capa:", erro)

        raise HTTPException(
            500,
            "Não foi possível enviar a imagem de capa."
        )
