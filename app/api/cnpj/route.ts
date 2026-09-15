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


  try{


    const cnpjLimpo =
      cnpj.replace(/\D/g,'')



    const response =
      await fetch(
        `${process.env.NEXT_PUBLIC_BASEPATH || ''}/api/cnpj?cnpj=${cnpjLimpo}`,
        {
          cache:'no-store'
        }
      )


    const texto =
      await response.text()



    let dados:any = null


    try{

      dados =
        JSON.parse(texto)

    }
    catch{

      console.error(
        '[ERRO PARSE CNPJ]',
        texto.substring(0,300)
      )


      return {

        sucesso:false,

        razaoSocial:'',

        nomeFantasia:'',

        cnpj:cnpjLimpo,

        erro:'Resposta inválida da API CNPJ'

      }

    }



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
        '',


    }



  }
  catch(error:any){


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