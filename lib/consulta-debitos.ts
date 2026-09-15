import { NextResponse } from 'next/server'

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
  anosDisponiveis: { ano: number; naoOptante: boolean }[]
  periodos: PeriodoApuracao[]
  error?: string
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
  { ano: 2026, naoOptante: false },
  { ano: 2025, naoOptante: false },
  { ano: 2024, naoOptante: false },
  { ano: 2023, naoOptante: false },
  { ano: 2022, naoOptante: false },
  { ano: 2021, naoOptante: false },
  { ano: 2020, naoOptante: false }
]


function obterNomeEmpresa(apiData:any, nomeDigitado:string){

  return (
    apiData?.nomeContribuinte ||
    apiData?.nomeEmpresarial ||
    apiData?.razaoSocial ||
    apiData?.nomeEmpresario ||
    nomeDigitado ||
    "MICROEMPREENDEDOR INDIVIDUAL"
  )

}



export async function consultarDebitos(
  cnpj:string,
  nome:string,
  ano:number
):Promise<ConsultaDebitosResponse>{


try{


const isServer = typeof window === 'undefined'


if(isServer){


const urlBasePHP =
(process.env.API_RECEITA_URL || 
'https://conektatecnologi1.websiteseguro.com')
.replace(/\/$/,'')



const urlCompleta =
urlBasePHP.includes('.php')
?
urlBasePHP
:
`${urlBasePHP}/consulta.php`



const urlPHP =
`${urlCompleta}?cnpj=${cnpj.replace(/\D/g,'')}&ano=${ano}`



console.log(
"[DEBUG] Requisitando URL na Locaweb:",
urlPHP
)



const resp = await fetch(urlPHP,{
cache:'no-store',
headers:{
Accept:'application/json',
'User-Agent':
'Mozilla/5.0'
}
})



if(!resp.ok){

throw new Error(
`PHP respondeu HTTP ${resp.status}`
)

}



const apiData = await resp.json()



console.log(
"[DEBUG] Payload cru recebido do PHP:",
JSON.stringify(apiData)
)



const nomeAtual =
obterNomeEmpresa(apiData,nome)



const listaApuracoes =
apiData.listaSituacaoApuracaoMei ||
apiData.situacoesApuracaoInssMei ||
apiData.situacaoApuracaoInssMei




// ===============================
// CNPJ BAIXADO
// ===============================

if(
apiData?.['mensagem-erro'] &&
String(apiData['mensagem-erro'].codigo)==='23033'
){


console.log(
"[DEBUG] CNPJ baixado. Buscando dados anteriores..."
)



let nomeResgatado = nomeAtual



const anosBusca = [
2025,
2024,
2023,
2022,
2021,
2020
]



for(const anoBusca of anosBusca){


try{


const urlNome =
`${urlCompleta}?cnpj=${cnpj.replace(/\D/g,'')}&ano=${anoBusca}`



const respNome =
await fetch(urlNome,{
cache:'no-store',
headers:{
Accept:'application/json'
}
})



if(respNome.ok){


const dataNome =
await respNome.json()



const nomeEncontrado =
obterNomeEmpresa(dataNome,'')



if(
nomeEncontrado &&
nomeEncontrado !==
"MICROEMPREENDEDOR INDIVIDUAL"
){

nomeResgatado =
nomeEncontrado

break

}


}


}catch(e){

console.error(
"Erro buscando nome:",
anoBusca,
e
)

}


}



return {

cnpj,

nome:nomeResgatado,

ano,

anosDisponiveis:
ANOS_MEI_PADRAO,

periodos:[]

}



}
        // ===============================
      // CNPJ NÃO OPTANTE
      // ===============================

      if(
        apiData?.['mensagem-erro'] &&
        (
          String(apiData['mensagem-erro'].codigo) === '23010' ||
          String(apiData['mensagem-erro'].texto || '')
          .toLowerCase()
          .includes('não optante')
        )
      ){

        return {

          cnpj,

          nome: obterNomeEmpresa(
            apiData,
            nome
          ),

          ano,

          anosDisponiveis:
            ANOS_MEI_PADRAO,

          periodos: []

        }

      }



      // ===============================
      // OUTROS ERROS DA RECEITA
      // ===============================

      if(
        apiData?.['mensagem-erro'] &&
        !listaApuracoes
      ){

        return {

          cnpj,

          nome:
          obterNomeEmpresa(
            apiData,
            nome
          ),

          ano,

          anosDisponiveis:
          ANOS_MEI_PADRAO,

          periodos: [],

          error:
          apiData['mensagem-erro'].texto ||
          "CNPJ sem dados para consulta."

        }

      }





      // ===============================
      // PROCESSAMENTO DOS DÉBITOS
      // ===============================

      if(
        Array.isArray(listaApuracoes)
      ){


        const periodos:PeriodoApuracao[] =
        listaApuracoes.map((item:any)=>{


          let mesIndex = 0


          const periodo =
          String(
            item.periodoApuracao || ''
          )



          if(periodo.includes('/')){


            mesIndex =
            parseInt(
              periodo.split('/')[0]
            ) - 1



          }else if(
            periodo.length === 6
          ){


            mesIndex =
            parseInt(
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
          Number(item.valorPrincipal) || 0


          const multa =
          Number(item.valorMulta) || 0


          const juros =
          Number(item.valorJuros) || 0



          const total =
          principal +
          multa +
          juros





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
            total > 0,



            beneficioInss:false,



            principal,


            multa,


            juros,


            total,



            dataVencimento:
            item.dataVencimento || '-',



            dataAcolhimento:
            new Date()
            .toLocaleDateString(
              'pt-BR'
            )

          }


        })





        return {


          cnpj,


          nome:
          obterNomeEmpresa(
            apiData,
            nome
          ),


          ano,



          anosDisponiveis:
          apiData.anosDisponiveis ||
          apiData.listaAnos ||
          ANOS_MEI_PADRAO,



          periodos


        }


      }





    }else{


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



      if(!resp.ok){

        throw new Error(
          "Erro na rota interna de débitos"
        )

      }



      return await resp.json()


    }





}catch(error:any){


console.error(
"Falha ao processar API do Serpro:",
error
)



throw new Error(
error.message ||
"Erro desconhecido na integração."
)


}




return {

  cnpj,

  nome:
  "ERRO DE VALIDAÇÃO",

  ano,

  anosDisponiveis:
  ANOS_MEI_PADRAO,

  periodos:[],

  error:
  "Não foi possível obter dados para este CNPJ."

}


}




export function formatBRL(
valor:number|null
):string{


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
