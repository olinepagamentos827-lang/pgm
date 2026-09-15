


export interface PeriodoApuracao {
  id: string
  rotulo: string
  apurado: boolean
  beneficioInss: boolean
  principal: number | null
  multa: number | null
  juros: number | null
  total: number | null
  dataVencimento: string | null
  dataAcolhimento: string | null
}


export interface ConsultaDebitosResponse {
  cnpj: string
  nome: string
  ano: number
  anosDisponiveis: number[]
  periodos: PeriodoApuracao[]
}


const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro'
]


const ANOS_MEI_PADRAO = [
  2026,
  2025,
  2024,
  2023,
  2022,
  2021,
  2020
]



async function buscarNomeEmpresa(cnpj:string) {

  try {

    const chave =
      process.env.CNPJ_API_KEY


    if (!chave) {
      console.log('[SNOOP] API KEY ausente')
      return ''
    }


    const resposta = await fetch(
      `https://snoopintelligence.cloud/api/v2/cnpj/${cnpj.replace(/\D/g,'')}`,
      {
        method:'GET',

        headers:{
          Authorization:`Bearer ${chave}`,
          Accept:'application/json'
        },

        cache:'no-store'
      }
    )


    const dados =
      await resposta.json()


    console.log(
      '[DEBUG SNOOP]',
      JSON.stringify(dados)
    )


    return (
      dados?.razao_social ||
      dados?.nome_fantasia ||
      dados?.data?.razao_social ||
      ''
    )


  } catch(e){

    console.error(
      '[ERRO SNOOP]',
      e
    )

    return ''

  }

}



export async function consultarDebitos(
  cnpj:string,
  nome:string,
  ano:number,
):Promise<ConsultaDebitosResponse>{


const isServer =
  typeof window === 'undefined'


try {


if(isServer){

  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

  const urlBasePHP =
(
  process.env.API_RECEITA_URL ||
  'https://websiteseguro.com'
).replace(/\/$/, '')


const urlCompleta =
urlBasePHP.includes('.php')
  ? urlBasePHP
  : `${urlBasePHP}/consulta.php`


const urlPHP =
`${urlCompleta}?cnpj=${cnpj.replace(/\D/g,'')}&ano=${ano}`



console.log(
 '[DEBUG] Requisitando URL na Locaweb:',
 urlPHP
)



const resp = await fetch(
 urlPHP,
 {
  cache:'no-store',

  headers:{
    Accept:'application/json',
    'User-Agent':
    'Mozilla/5.0 Chrome'
  }
 }
)


if(!resp.ok){

 throw new Error(
  `PHP respondeu HTTP ${resp.status}`
 )

}



const apiData =
await resp.json()



console.log(
 '[DEBUG] Payload cru recebido do PHP:',
 JSON.stringify(apiData)
)



let nomeFinal =
apiData.nomeContribuinte ||
nome ||
'MICROEMPREENDEDOR INDIVIDUAL'



if(
 !apiData.nomeContribuinte
){

 const nomeSnoop =
 await buscarNomeEmpresa(cnpj)


 if(nomeSnoop){

  nomeFinal =
  nomeSnoop

 }

}
        // ================================
      // TRATAMENTO DE ERROS SERPRO
      // ================================

      if (apiData['mensagem-erro']) {


        const codigo =
          String(
            apiData['mensagem-erro'].codigo || ''
          )


        const texto =
          String(
            apiData['mensagem-erro'].texto || ''
          )


        console.log(
          '[DEBUG ERRO SERPRO]',
          codigo,
          texto
        )



        // Exige entrega DASN de anos anteriores

        if(codigo === '23015'){


          const anos =
            texto.match(/\d{4}/g)
            ?.map(Number)
            ||
            ANOS_MEI_PADRAO



          return {

            cnpj,

            nome:nomeFinal,

            ano,

            anosDisponiveis:anos,

            periodos:[]

          }


        }



        // CNPJ baixado

        if(codigo === '23033'){


          return {

            cnpj,

            nome:nomeFinal,

            ano,

            anosDisponiveis:
              ANOS_MEI_PADRAO,

            periodos:[]

          }


        }


      }



      // ================================
      // LISTA DE DÉBITOS
      // ================================


      const listaApuracoes =
        apiData.listaSituacaoApuracaoMei ||
        apiData.situacoesApuracaoInssMei ||
        apiData.situacaoApuracaoInssMei



      if(
        apiData.success &&
        Array.isArray(listaApuracoes)
      ){


        const periodos =
        listaApuracoes.map(
          (item:any)=>{


            let mesIndex = 0


            const periodo =
              String(
                item.periodoApuracao || ''
              )



            if(periodo.includes('/')){


              mesIndex =
              Number(
                periodo.split('/')[0]
              ) - 1


            }
            else if(periodo.length===6){


              mesIndex =
              Number(
                periodo.substring(4,6)
              ) - 1


            }



            if(
              isNaN(mesIndex) ||
              mesIndex < 0 ||
              mesIndex > 11
            ){

              mesIndex=0

            }



            const principal =
              Number(
                item.valorPrincipal
              ) || 0


            const multa =
              Number(
                item.valorMulta
              ) || 0


            const juros =
              Number(
                item.valorJuros
              ) || 0



            return {


              id:
              `${ano}-${String(
                mesIndex+1
              ).padStart(2,'0')}`,



              rotulo:
              `${MESES[mesIndex]}/${ano}`,



              apurado:
              item.situacaoApuracao === 'APURADO' ||
              item.situacaoApuracao === 'DEVEDOR' ||
              principal+multa+juros > 0,



              beneficioInss:false,


              principal,

              multa,

              juros,


              total:
              principal+multa+juros,



              dataVencimento:
              item.dataVencimento || '-',



              dataAcolhimento:
              new Date()
              .toLocaleDateString('pt-BR')

            }


          }
        )



        return {

          cnpj,

          nome:nomeFinal,

          ano,

          anosDisponiveis:
          ANOS_MEI_PADRAO,

          periodos

        }


      }



    }



    else {


      const basePath =
      process.env.NEXT_PUBLIC_BASEPATH || ''


      const urlInterna =
      `${basePath}/api/debitos?cnpj=${cnpj}&ano=${ano}`



      const resp =
      await fetch(
        urlInterna,
        {
          cache:'no-store'
        }
      )



      return await resp.json()


    }



}
catch(error:any){


console.error(
 'Falha ao processar API do Serpro:',
 error
)


throw new Error(
 error.message ||
 'Erro desconhecido'
)


}



return {

 cnpj,

 nome:
 'Nenhum dado encontrado',

 ano,

 anosDisponiveis:
 ANOS_MEI_PADRAO,

 periodos:[]

}


}



export function formatBRL(
 valor:number|null
){

 if(valor===null || valor===undefined){

  return '-'

 }


 return valor.toLocaleString(
  'pt-BR',
  {
   style:'currency',
   currency:'BRL'
  }
 )

}
