
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.database import engine, get_db

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

    if len(nome) > 100 or len(email) > 100 or len(assunto) > 150:
        raise HTTPException(
            status_code=400,
            detail="Um ou mais campos ultrapassaram o limite permitido."
        )

    try:
        resultado = db.execute(
            text("""
                INSERT INTO public.contatos
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
