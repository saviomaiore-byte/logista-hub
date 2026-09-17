# Conta de teste para o chefe — teste@maiore.com.br

## Objetivo
Entregar ao chefe uma conta pronta para login: **teste@maiore.com.br**, nome "Teste Maiore", perfil **administrador**, com senha forte gerada e mostrada no chat.

## Estado atual (verificado no banco)
- `teste@maiore.com.br` já existe, mas está **sem e-mail confirmado**, sem perfil e sem papel (não consegue logar).
- Os demais usuários são administradores confirmados.

## Passos
1. Gerar uma senha forte aleatória (16+ caracteres) no ambiente local.
2. No banco, em uma única alteração de dados:
   - Confirmar o e-mail da conta (`email_confirmed_at`) — dispensa o clique no e-mail de verificação.
   - Gravar a senha criptografada (`crypt`, bcrypt).
   - Definir o nome "Teste Maiore" nos dados do usuário.
   - O gatilho existente cria o perfil automaticamente após a confirmação; se não criar, inserir o perfil manualmente.
3. Inserir o papel **admin** na tabela de papéis dessa conta.
4. Validar: conferir no banco que perfil e papel existem e fazer um login de teste na tela de login com o e-mail e a senha nova.
5. Mostrar no chat as credenciais finais (e-mail + senha) para repassar ao chefe, com a dica de trocar a senha depois.

## O que não muda
- Nenhuma tela, layout, código, regra de acesso ou dado de outros usuários é alterado. Apenas a conta teste@maiore.com.br é configurada.

## Pontos de revisão
- A senha será exibida no chat — recomendo que o chefe troque após o primeiro acesso (a tela de segurança do app já suporta isso).
- A conta terá acesso de administrador (pode gerenciar usuários e excluir registros). Se depois preferir acesso limitado, basta pedir a troca do papel.
