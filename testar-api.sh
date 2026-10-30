#!/usr/bin/env bash
# Bateria de testes da API Folhagem & Cia (Parte 7 do guia, automatizada).
# Uso: com a API no ar (docker compose up -d), rode: bash testar-api.sh
# As plantas criadas pelo teste são apagadas no final.

BASE="${BASE:-http://localhost:3001}"
PASSOU=0
FALHOU=0
CRIADAS=()

# req METODO CAMINHO [CORPO]  -> preenche STATUS e RESP
req() {
  local tmp
  tmp=$(mktemp)
  if [ -n "${3:-}" ]; then
    STATUS=$(curl -s -o "$tmp" -w "%{http_code}" -X "$1" "$BASE$2" \
      -H "Content-Type: application/json" -d "$3")
  else
    STATUS=$(curl -s -o "$tmp" -w "%{http_code}" -X "$1" "$BASE$2")
  fi
  RESP=$(cat "$tmp")
  rm -f "$tmp"
}

# confere "descrição" STATUS_ESPERADO
confere() {
  if [ "$STATUS" = "$2" ]; then
    echo "  ok     $1 -> $STATUS"
    PASSOU=$((PASSOU + 1))
  else
    echo "  FALHA  $1 -> esperado $2, veio $STATUS"
    echo "         resposta: $RESP"
    FALHOU=$((FALHOU + 1))
  fi
}

# verdade "descrição" comando...
verdade() {
  local desc=$1
  shift
  if "$@"; then
    echo "  ok     $desc"
    PASSOU=$((PASSOU + 1))
  else
    echo "  FALHA  $desc"
    echo "         resposta: $RESP"
    FALHOU=$((FALHOU + 1))
  fi
}

tem() { grep -q -- "$1" <<<"$RESP"; }
nao_tem() { ! grep -q -- "$1" <<<"$RESP"; }
igual() { [ "$1" = "$2" ]; }
inclui() { grep -q "\"id\":$1," <<<"$RESP"; }
exclui() { ! inclui "$1"; }
ambos() { "$1" "$2" && "$3" "$4"; }
campo() { grep -o "\"$1\":[^,}]*" <<<"$RESP" | head -1 | cut -d: -f2- | tr -d '"'; }

# planta NOME PRECO ESTOQUE LUMINOSIDADE PETFRIENDLY REGA  (valores em JSON cru)
planta() {
  printf '{"nome":%s,"especie":"Monstera deliciosa","preco":%s,"estoque":%s,"luminosidade":%s,"petFriendly":%s,"regaACadaDias":%s}' \
    "$1" "$2" "$3" "$4" "$5" "$6"
}

# cria CORPO -> faz o POST e guarda o id em ID_CRIADO se vier 201
cria() {
  req POST /plantas "$1"
  ID_CRIADO=""
  if [ "$STATUS" = 201 ]; then
    ID_CRIADO=$(campo id)
    CRIADAS+=("$ID_CRIADO")
  fi
}

echo "== Conexão"
req GET /
if [ "$STATUS" != 200 ]; then
  echo "  A API não respondeu em $BASE (status '$STATUS'). Rode: docker compose up -d"
  exit 1
fi
echo "  ok     API no ar em $BASE"

echo
echo "== Cadastro (POST /plantas)"
cria "$(planta '"Teste Costela"' 8990 12 '"MEIA_SOMBRA"' false 7)"
confere "1. corpo válido" 201
ID=$ID_CRIADO
verdade "   resposta traz createdAt e updatedAt (nomes do enunciado)" tem '"updatedAt"'
cria "$(planta '"Teste Esgotada"' 8990 0 '"MEIA_SOMBRA"' false 7)"
confere "2. estoque 0 e petFriendly false" 201
ID_ESGOTADA=$ID_CRIADO
cria '{"nome":"Teste","preco":8990,"estoque":1,"luminosidade":"SOMBRA","petFriendly":true,"regaACadaDias":3}'
confere "3. sem o campo especie" 400
cria "$(planta '"Teste"' 0 12 '"MEIA_SOMBRA"' false 7)"
confere "4. preco 0" 400
cria "$(planta '"Teste"' 8990 -1 '"MEIA_SOMBRA"' false 7)"
confere "5. estoque -1" 400
cria "$(planta '"Teste"' '"8990"' 12 '"MEIA_SOMBRA"' false 7)"
confere "6. preco \"8990\" em texto" 400
cria "$(planta '"Teste"' 8990 12 '"LUA"' false 7)"
confere "7. luminosidade LUA" 400
cria "$(planta '"Teste"' 89.9 12 '"MEIA_SOMBRA"' false 7)"
confere "8. preco 89.9" 400
cria "$(planta '"Teste"' 8990 12 '"MEIA_SOMBRA"' false 0)"
confere "9. regaACadaDias 0" 400
cria "$(planta '"   "' 8990 12 '"MEIA_SOMBRA"' false 7)"
confere "10. nome só com espaços" 400
cria "$(planta '"Teste"' 8990 12 '"MEIA_SOMBRA"' '"false"' 7)"
confere "11. petFriendly \"false\" em texto" 400
cria '{}'
confere "12. corpo vazio {}" 400

echo
echo "== Busca (GET /plantas/:id)"
req GET "/plantas/$ID"
confere "13. id que existe" 200
req GET /plantas/999999
confere "14. id que não existe" 404
req GET /plantas/abc
confere "15. id abc" 400
req GET /plantas/0
confere "16a. id 0" 400
req GET /plantas/1.5
confere "16b. id 1.5" 400

echo
echo "== Edição (PATCH /plantas/:id)"
req PATCH "/plantas/$ID" '{"preco":7990}'
confere "17. só o preco" 200
req GET "/plantas/$ID"
verdade "    preco mudou para 7990" igual "$(campo preco)" 7990
verdade "    estoque continuou 12" igual "$(campo estoque)" 12
req PATCH "/plantas/$ID" '{"estoque":-5}'
confere "18. estoque -5" 400
req PATCH /plantas/999999 '{"preco":7990}'
confere "19. id que não existe" 404
req PATCH "/plantas/$ID" '{}'
confere "20. corpo vazio {}" 400
req PATCH "/plantas/$ID" '{"petFriendly":true}'
confere "21. petFriendly true" 200

echo
echo "== Listagem e filtros (GET /plantas)"
# Agora: ID = MEIA_SOMBRA + pet true; ID_ESGOTADA = MEIA_SOMBRA + pet false
cria "$(planta '"Teste Sombra"' 4990 3 '"SOMBRA"' true 5)"
ID_SOMBRA=$ID_CRIADO
req GET /plantas
confere "    sem filtro" 200
verdade "    sem filtro traz pet-friendly E não pet-friendly" \
  ambos inclui "$ID" inclui "$ID_ESGOTADA"
req GET "/plantas?luminosidade=SOMBRA"
confere "22. só luminosidade" 200
verdade "    traz a de SOMBRA e não a de MEIA_SOMBRA" \
  ambos inclui "$ID_SOMBRA" exclui "$ID"
req GET "/plantas?petFriendly=true"
confere "23. só petFriendly=true" 200
verdade "    traz a pet-friendly e não a outra" \
  ambos inclui "$ID" exclui "$ID_ESGOTADA"
req GET "/plantas?petFriendly=false"
verdade "    petFriendly=false traz só a não pet-friendly" \
  ambos inclui "$ID_ESGOTADA" exclui "$ID"
req GET "/plantas?luminosidade=SOMBRA&petFriendly=true"
confere "24. os dois filtros juntos" 200
verdade "    só a que cumpre as duas condições" \
  ambos inclui "$ID_SOMBRA" exclui "$ID"
req GET "/plantas?luminosidade=LUA"
confere "25. luminosidade=LUA" 400
req GET "/plantas?petFriendly=sim"
confere "26. petFriendly=sim" 400

echo
echo "== Venda (POST /plantas/:id/venda)"
cria "$(planta '"Teste Venda"' 3000 5 '"SOL_PLENO"' false 2)"
ID_VENDA=$ID_CRIADO
req POST "/plantas/$ID_VENDA/venda" '{"quantidade":2}'
confere "28. vende 2 de 5" 200
verdade "    estoque caiu para 3" igual "$(campo estoque)" 3
req POST "/plantas/$ID_VENDA/venda" '{"quantidade":10}'
confere "29. quantidade maior que o estoque" 400
req GET "/plantas/$ID_VENDA"
verdade "    estoque continuou 3" igual "$(campo estoque)" 3
req POST "/plantas/$ID_VENDA/venda" '{"quantidade":0}'
confere "30. quantidade 0" 400
req POST "/plantas/$ID_VENDA/venda" '{"quantidade":"2"}'
confere "31. quantidade \"2\" em texto" 400
req POST "/plantas/$ID_VENDA/venda" '{}'
confere "    sem quantidade" 400
req POST /plantas/999999/venda '{"quantidade":1}'
confere "32. id que não existe" 404
req POST "/plantas/$ID_VENDA/venda" '{"quantidade":3}'
confere "33. quantidade igual ao estoque" 200
verdade "    estoque zerou" igual "$(campo estoque)" 0
req POST "/plantas/$ID_VENDA/venda" '{"quantidade":1}'
confere "    vender planta esgotada" 400

cria "$(planta '"Teste Corrida"' 3000 1 '"SOL_PLENO"' false 2)"
ID_CORRIDA=$ID_CRIADO
pasta=$(mktemp -d)
for i in 1 2; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST "$BASE/plantas/$ID_CORRIDA/venda" \
    -H "Content-Type: application/json" -d '{"quantidade":1}' >"$pasta/$i" &
done
wait
RESP=$(sort "$pasta"/1 "$pasta"/2 | tr '\n' ' ')
rm -rf "$pasta"
verdade "    duas vendas simultâneas do último vaso: um 200 e um 400" igual "$RESP" "200 400 "
req GET "/plantas/$ID_CORRIDA"
verdade "    estoque terminou em 0, não negativo" igual "$(campo estoque)" 0

echo
echo "== Valor total (GET /plantas/estoque/valor-total)"
req GET /plantas/estoque/valor-total
confere "34. responde" 200
verdade "    traz valorTotalEmCentavos e totalDeVasos" \
  ambos tem valorTotalEmCentavos tem totalDeVasos
VALOR_ANTES=$(campo valorTotalEmCentavos)
VASOS_ANTES=$(campo totalDeVasos)
cria "$(planta '"Teste Dez Reais"' 1000 2 '"SOMBRA"' false 3)"
cria "$(planta '"Teste Cinquenta"' 5000 1 '"SOMBRA"' false 3)"
req GET /plantas/estoque/valor-total
verdade "    soma preco x estoque linha a linha (+7000 centavos)" \
  igual "$(($(campo valorTotalEmCentavos) - VALOR_ANTES))" 7000
verdade "    total de vasos (+3)" igual "$(($(campo totalDeVasos) - VASOS_ANTES))" 3

echo
echo "== Remoção (DELETE /plantas/:id)"
req DELETE "/plantas/$ID"
confere "36. id que existe" 204
req GET "/plantas/$ID"
confere "37. buscar a planta deletada" 404
req DELETE "/plantas/$ID"
confere "38. deletar de novo" 404
req DELETE /plantas/abc
confere "    id abc" 400

echo
echo "== Rota inexistente"
req GET /nao-existe
confere "    GET /nao-existe" 404

for id in "${CRIADAS[@]}"; do
  curl -s -o /dev/null -X DELETE "$BASE/plantas/$id"
done

echo
echo "Resultado: $PASSOU ok, $FALHOU falha(s)."
[ "$FALHOU" -eq 0 ]
