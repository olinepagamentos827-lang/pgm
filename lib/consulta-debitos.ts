import { consultarCnpj } from './consulta-cnpj'


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



export async function consultarDebitos(
  cnpj: string,
  nome: string,
  ano: number
): Promise<ConsultaDebitosResponse> {


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



      const urlPHP =
        urlBasePHP.includes('.php')
          ? `${urlBasePHP}?cnpj=${cnpj.replace(/\D/g,'')}&ano=${ano}`
          : `${urlBasePHP}/consulta.php?cnpj=${cnpj.replace(/\D/g,'')}&ano=${ano}`



      console.log(
        '[DEBUG] Requisitando URL na Locaweb:',
        urlPHP
      )



      const resposta =
        await fetch(
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



      if(!resposta.ok){

        throw new Error(
          `PHP respondeu HTTP ${resposta.status}`
        )

      }



      const apiData =
        await resposta.json()



      console.log(
        '[DEBUG] Payload cru recebido do PHP:',
        JSON.stringify(apiData)
      )



      let nomeFinal =
        apiData.nomeContribuinte ||
        nome ||
        ''



      // =====================================================
      // TRATAMENTO DE ERROS SERPRO
      // =====================================================


      if(apiData['mensagem-erro']){


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



        // Busca nome somente quando Serpro não trouxe
        if(!nomeFinal){


          try {


            const empresa =
              await consultarCnpj(cnpj)



            nomeFinal =
              empresa.razaoSocial ||
              empresa.nomeFantasia ||
              nomeFinal



          } catch(e){

            console.log(
              '[DEBUG] Falha consulta CNPJ:',
              e
            )

          }


        }



        if(!nomeFinal){

          nomeFinal =
          'MICROEMPREENDEDOR INDIVIDUAL'

        }



        // DASN pendente

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





      // =====================================================
      // LISTA DE DÉBITOS
      // =====================================================


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
              else if(periodo.length === 6){


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

                mesIndex = 0

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
                  mesIndex + 1
                ).padStart(2,'0')}`,



                rotulo:
                `${MESES[mesIndex]}/${ano}`,



                apurado:
                  item.situacaoApuracao === 'APURADO' ||
                  item.situacaoApuracao === 'DEVEDOR' ||
                  principal + multa + juros > 0,



                beneficioInss:false,


                principal,

                multa,

                juros,



                total:
                principal + multa + juros,



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

          nome:nomeFinal || 'MICROEMPREENDEDOR INDIVIDUAL',

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



      const resposta =
        await fetch(
          urlInterna,
          {
            cache:'no-store'
          }
        )



      return await resposta.json()


    }



  }
  catch(error:any){


    console.error(
      'Falha ao processar API do Serpro:',
      error
    )



    throw new Error(
      error.message ||
      'Erro desconhecido na consulta'
    )


  }



  return {

    cnpj,

    nome:'Nenhum dado encontrado',

    ano,

    anosDisponiveis:
    ANOS_MEI_PADRAO,

    periodos:[]

  }


}




export function formatBRL(
  valor:number|null
){


  if(
    valor === null ||
    valor === undefined
  ){

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
