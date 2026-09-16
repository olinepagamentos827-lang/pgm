export interface ConsultaCnpjResponse {
  sucesso: boolean
  razaoSocial: string
  nomeFantasia: string
  cnpj: string
  erro?: string
}


export async function consultarCnpj(cnpj:string){

  try {

    const cnpjLimpo = cnpj.replace(/\D/g,'')

  const baseUrl =
  process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000'


const url =
`${baseUrl}/api/cnpj?cnpj=${cnpjLimpo}`


    console.log(
      '[DEBUG CONSULTA CNPJ]',
      url
    )


    const resposta =
      await fetch(
        url,
        {
          cache:'no-store'
        }
      )


    if(!resposta.ok){

      throw new Error(
        `API CNPJ HTTP ${resposta.status}`
      )

    }


    const dados =
      await resposta.json()


    console.log(
      '[DEBUG RETORNO CNPJ]',
      JSON.stringify(dados)
    )


    return {

      razaoSocial:
        dados.razao_social ||
        dados.razaoSocial ||
        dados.data?.razao_social ||
        '',


      nomeFantasia:
        dados.nome_fantasia ||
        dados.nomeFantasia ||
        dados.data?.nome_fantasia ||
        ''

    }


  } catch(error){

    console.error(
      '[ERRO CONSULTA CNPJ]',
      error
    )


    return {

      razaoSocial:'',
      nomeFantasia:''

    }

  }

}
