export interface ConsultaCnpjResponse {
  sucesso: boolean
  razaoSocial: string
  nomeFantasia: string
  cnpj: string
  erro?: string
}


export async function consultarCnpj(
  cnpj:string
):Promise<ConsultaCnpjResponse>{


  try {


    const cnpjLimpo =
      cnpj.replace(/\D/g,'')


    const apiKey =
      process.env.CNPJ_API_KEY



    if(!apiKey){

      console.error(
        '[SNOOP] API KEY AUSENTE'
      )

      return {

        sucesso:false,
        razaoSocial:'',
        nomeFantasia:'',
        cnpj:cnpjLimpo,
        erro:'API KEY ausente'

      }

    }



    console.log(
      '[SNOOP] Consultando:',
      cnpjLimpo
    )



    const resposta =
      await fetch(
        `https://snoopintelligence.cloud/api/v2/cnpj/${cnpjLimpo}`,
        {

          method:'GET',

          headers:{

            Authorization:
            `Bearer ${apiKey}`,

            Accept:
            'application/json'

          },

          cache:'no-store'

        }
      )



    const texto =
      await resposta.text()



    console.log(
      '[SNOOP RAW]',
      texto.substring(0,500)
    )



    if(!resposta.ok){

      throw new Error(
        `SNOOP HTTP ${resposta.status}`
      )

    }



    const dados =
      JSON.parse(texto)



    const empresa =
      dados?.data || dados



    return {


      sucesso:true,


      cnpj:
      empresa.cnpj ||
      cnpjLimpo,


      razaoSocial:
      empresa.razao_social ||
      empresa.razaoSocial ||
      '',


      nomeFantasia:
      empresa.nome_fantasia ||
      empresa.nomeFantasia ||
      ''


    }



  } catch(error:any){


    console.error(
      '[ERRO CONSULTA CNPJ]',
      error
    )


    return {

      sucesso:false,

      razaoSocial:'',

      nomeFantasia:'',

      cnpj,

      erro:error.message

    }

  }

}
