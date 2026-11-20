# Meus Lembretes: Corner do Nak Muay

Front-end do trabalho de Programação III (UMFG). Gerencia lembretes consumindo uma Minimal API em .NET, com interface temática de **lutadores de Muay Thai**.

Aluno: Leonardo Nicolin

## Como executar

1. Suba o MySQL (usuário `root`, senha `root`, porta `3306`).
2. Na pasta da API, rode:
   ```
   dotnet run --launch-profile https
   ```
   A API fica em `https://localhost:7063`.
3. Abra o `index.html` no navegador (duplo clique ou Live Server).

## Estrutura do projeto

```
index.html      estrutura da página (banner, formulário, filtros, tabela, paginação)
css/style.css   estilização (tema Muay Thai, responsivo)
js/app.js       comunicação com a API e regras da tela
```

## Etapa 1: Como o front-end funciona

- **HTML:** uma única página com o banner, o formulário de cadastro/edição (escondido até clicar em "Novo lembrete"), a área de filtros, a tabela e a paginação.
- **CSS:** variáveis de cor e fonte no bloco `:root`, layout com flexbox e grid, e `@media` para telas pequenas.
- **JavaScript:** usa `fetch` com `async/await` para chamar a API, `URLSearchParams` para montar a query string dos filtros e `JSON.stringify` para enviar o corpo do POST e do PUT. Os dados recebidos são renderizados na tabela pela função `renderizarLembretes`.

### Endpoints da API

| Método | Rota | Uso |
|---|---|---|
| GET | `/lembretes` | lista todos os lembretes ativos |
| GET | `/lembretes/{id}` | busca um lembrete (usado ao clicar em Editar) |
| GET | `/lembretes/filtro` | lista com filtros, paginação e ordenação |
| GET | `/lembretes/imprimir` | gera o relatório em PDF com os mesmos filtros |
| POST | `/lembretes` | cadastra um lembrete (`{ "descricao": "..." }`) |
| PUT | `/lembretes/{id}` | atualiza a descrição |
| DELETE | `/lembretes/{id}` | exclusão lógica (`IsAtivo = false`) |

## Etapa 3: CORS

O navegador aplica a **política de mesma origem**: uma página só pode ler respostas de um servidor com o mesmo protocolo, domínio e porta. Aqui o front-end roda em outra origem (`file://` ou `http://127.0.0.1:5500`) e a API em `https://localhost:7063`. Sem autorização da API, o navegador bloquearia a leitura das respostas.

Na API, o `Program.cs` define a política `Frontend` (`AllowAnyOrigin`, `AllowAnyHeader`, `AllowAnyMethod`) e a ativa com `app.UseCors("Frontend")`. Com isso, a API responde com o cabeçalho `Access-Control-Allow-Origin: *`, visível na aba Network do navegador (ver evidências). Requisições como PUT, DELETE e POST com `Content-Type: application/json` ainda passam por uma checagem prévia (_preflight_, método OPTIONS), que a mesma política libera.

No DevTools, as requisições mostram `Origin: null` e `Sec-Fetch-Site: cross-site`: como o front-end foi aberto como arquivo (`file://`), o navegador o trata como uma origem diferente da API e só libera a leitura da resposta por causa do cabeçalho `Access-Control-Allow-Origin: *`.

Em um sistema real, o ideal é restringir a origem com `.WithOrigins("https://dominio-do-front")` em vez de aceitar qualquer uma.

## Funcionalidades implementadas

- **Cadastro, edição e exclusão** de lembretes, com confirmação antes de excluir.
- **Filtros:** descrição, data de cadastro inicial e final, data de atualização inicial e final, botão Limpar.
- **Paginação:** botões Anterior e Próxima, indicador "Página X de Y" e escolha de 5, 10 ou 20 registros por página.
- **Ordenação:** clique no título de Descrição, Cadastro ou Atualização; o clique repetido inverte a direção (▲ e ▼).
- **Relatório em PDF** com os filtros aplicados.
- **Mensagens de usabilidade:** sucesso, erro de comunicação com a API, nenhum registro encontrado e campo obrigatório vazio.

## Observações sobre a API

Duas questões da API foram tratadas:

1. **Ordenação (alteração na API).** O código original usava `OrderBy(x => dto.Ordem)`, que ordena por um valor constante e, por isso, não alterava a ordem (o SQL gerado tinha `ORDER BY (SELECT 1)`). Foi substituído em `FiltrarLembretes` por um `switch` que ordena por `Descricao`, `DataAtualizacao` ou `DataCadastro`, e o SQL passou a ter `ORDER BY l.Descricao`.
2. **Datas vazias (tratado no front-end).** Os valores padrão do DTO fazem o filtro retornar vazio quando algumas datas não são enviadas. Por isso o `app.js` envia `0001-01-01` e `9999-12-30` nos campos de data em branco.

