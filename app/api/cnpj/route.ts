import { NextResponse } from 'next/server'


export async function GET(
  request: Request
) {

  try {


    const { searchParams } =
      new URL(request.url)


    const cnpj =
      searchParams.get('cnpj')?.replace(/\D/g,'') || ''



    if(!cnpj){

      return NextResponse.json(
        {
          sucesso:false,
          erro:'CNPJ não informado'
        },
        {
          status:400
        }
      )

    }



    const apiKey =
      process.env.CNPJ_API_KEY



    if(!apiKey){

      return NextResponse.json(
        {
          sucesso:false,
          erro:'CNPJ_API_KEY não configurada'
        },
        {
          status:500
        }
      )

    }



    console.log(
      '[API CNPJ] Consultando SNOOP:',
      cnpj
    )



    const resposta =
      await fetch(
        `https://snoopintelligence.cloud/api/v2/cnpj/${cnpj}`,
        {

          method:'GET',

          headers:{
            Authorization:`Bearer ${apiKey}`,
            Accept:'application/json'
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



    let dados:any


    try{

      dados =
        JSON.parse(texto)

    }
    catch{

      return NextResponse.json(
        {
          sucesso:false,
          erro:'Snoop retornou resposta inválida',
          resposta:texto.substring(0,200)
        },
        {
          status:502
        }
      )

    }



    if(!resposta.ok){

      return NextResponse.json(
        {
          sucesso:false,
          erro:'Erro na API Snoop',
          detalhe:dados
        },
        {
          status:resposta.status
        }
      )

    }



    const empresa =
      dados?.data || dados



    return NextResponse.json({

      sucesso:true,

      cnpj:
        empresa.cnpj ||
        cnpj,


      razaoSocial:
        empresa.razao_social ||
        empresa.razaoSocial ||
        '',


      nomeFantasia:
        empresa.nome_fantasia ||
        empresa.nomeFantasia ||
        '',


      dados:empresa

    })


  }
  catch(error:any){


    console.error(
      '[ERRO API CNPJ]',
      error
    )


    return NextResponse.json(
      {
        sucesso:false,
        erro:error.message
      },
      {
        status:500
      }
    )


  }

}
